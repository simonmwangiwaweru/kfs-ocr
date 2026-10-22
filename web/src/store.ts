import { create } from 'zustand';
import { toast } from 'sonner';
import { db, type ScanRecord } from './db';
import { extractDocument, OcrError, prepareImage } from './ocr';
import { applyCellValue, applyComment, applyToggleComment, applyVerifyAll } from './lib/documents';
import { formatCount } from './lib/format';

export type Tab = 'scan' | 'review' | 'archive';

export interface Progress {
  fileName: string;
  /** 1-3: preparing, reading, building the table. */
  step: number;
  label: string;
  /** Position in a multi-page batch, 1-based. */
  index: number;
  total: number;
}

interface KeyDialog {
  open: boolean;
  reason: string | null;
}

interface State {
  ready: boolean;
  documents: ScanRecord[];
  activeId: string | null;
  tab: Tab;
  progress: Progress | null;
  keyDialog: KeyDialog;
  online: boolean;

  init: () => Promise<void>;
  setTab: (tab: Tab) => void;
  openDocument: (id: string, tab?: Tab) => void;
  scanFiles: (files: File[]) => Promise<void>;
  retryOcr: (id: string) => Promise<void>;
  retryAllPending: () => Promise<void>;
  openKeyDialog: (reason?: string | null) => void;
  closeKeyDialog: () => void;

  editCell: (docId: string, rowNumber: number, key: string, value: string) => Promise<void>;
  confirmCell: (docId: string, rowNumber: number, key: string) => Promise<void>;
  addComment: (docId: string, rowNumber: number, key: string, text: string) => Promise<void>;
  toggleComment: (docId: string, rowNumber: number, commentId: string) => Promise<void>;
  verifyAll: (docId: string) => Promise<void>;
  /** Writes a whole record back (used by Undo). */
  replaceDocument: (doc: ScanRecord) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
}

// Ids written by earlier builds as demo data. Real scans are never matched by anything but their id.
const isLegacySample = (id: string) => id === 'DOC-ABER-2023-01' || id.startsWith('DOC-SAMPLE-');

const inFlight = new Set<string>();

/** Dev-only fixtures (see dev/worstCase.ts) live in memory and never touch IndexedDB. */
const isEphemeral = (id: string) => id.startsWith('DEV-');

export const useStore = create<State>((set, get) => {
  const byId = (id: string) => get().documents.find((d) => d.id === id);

  const replace = (doc: ScanRecord) =>
    set((s) => ({ documents: s.documents.map((d) => (d.id === doc.id ? doc : d)) }));

  async function persist(doc: ScanRecord) {
    if (isEphemeral(doc.id)) return;
    try {
      await db.scans.put(doc);
    } catch (e) {
      console.error('IndexedDB write failed', e);
      toast.error('Could not save to this device', {
        description: 'Storage may be full. Export your documents, then delete old ones.'
      });
    }
  }

  async function commit(doc: ScanRecord) {
    replace(doc);
    await persist(doc);
  }

  async function mutate(docId: string, fn: (doc: ScanRecord) => ScanRecord) {
    const doc = byId(docId);
    if (doc) await commit(fn(doc));
  }

  function keyProblem(code: 'NO_API_KEY' | 'INVALID_API_KEY' | 'QUOTA_EXCEEDED') {
    const reason =
      code === 'QUOTA_EXCEEDED'
        ? 'The Gemini quota has been reached. Add your own free key to keep scanning.'
        : code === 'INVALID_API_KEY'
          ? 'The Gemini key was rejected. Paste a valid key from Google AI Studio.'
          : 'Add a free Gemini key to read handwriting. Your photo is saved and will be read as soon as a key is added.';
    set({ keyDialog: { open: true, reason } });
  }

  /** Runs OCR for one saved record and writes the outcome back. Returns whether the batch should keep going. */
  async function runOcr(id: string, position = { index: 1, total: 1 }): Promise<boolean> {
    const doc = byId(id);
    if (!doc?.imageDataUrl || inFlight.has(id)) return true;
    inFlight.add(id);
    const fileName = doc.fileName || doc.title;

    try {
      const result = await extractDocument(doc.imageDataUrl, fileName, (step, label) =>
        set({ progress: { fileName, step, label, ...position } })
      );

      // The photo may have been deleted while it was being read. Writing it back would resurrect it.
      const current = byId(id);
      if (!current) return true;

      const done: ScanRecord = {
        ...current,
        title: result.title,
        documentType: result.documentType,
        institution: result.institution,
        subHeader: result.subHeader,
        personName: result.personName,
        idNumber: result.idNumber,
        summary: result.summary,
        metadataFields: result.metadataFields,
        tableHeaders: result.tableHeaders,
        plotCode: result.idNumber,
        forestStation: result.institution,
        rows: result.rows,
        fileType: `Gemini (${result.model})`,
        syncStatus: 'SYNCED',
        ocrStatus: 'done',
        ocrError: undefined,
        isVerified: false
      };
      await commit(done);
      return true;
    } catch (e) {
      const err = e instanceof OcrError ? e : new OcrError('FAILED', (e as Error)?.message);

      if (err.code === 'OFFLINE') {
        await commit({ ...doc, ocrStatus: 'pending', ocrError: undefined, syncStatus: 'SAVED_OFFLINE' });
        toast('Saved on this device', { description: 'It will be read automatically when you are back online.' });
        return false;
      }
      if (err.code === 'NO_API_KEY' || err.code === 'INVALID_API_KEY' || err.code === 'QUOTA_EXCEEDED') {
        await commit({ ...doc, ocrStatus: 'pending', ocrError: undefined, syncStatus: 'SAVED_OFFLINE' });
        keyProblem(err.code);
        return false;
      }
      await commit({ ...doc, ocrStatus: 'failed', ocrError: err.message, syncStatus: 'SAVED_OFFLINE' });
      toast.error('Could not read this document', { description: err.message });
      return true; // a bad page shouldn't stop the rest of a batch
    } finally {
      inFlight.delete(id);
    }
  }

  return {
    ready: false,
    documents: [],
    activeId: null,
    tab: 'scan',
    progress: null,
    keyDialog: { open: false, reason: null },
    online: typeof navigator === 'undefined' ? true : navigator.onLine,

    init: async () => {
      let documents: ScanRecord[] = [];
      try {
        const all = await db.scans.toArray();
        const sample = all.filter((d) => isLegacySample(d.id));
        await Promise.all(sample.map((d) => db.scans.delete(d.id)));
        documents = all.filter((d) => !isLegacySample(d.id)).sort((a, b) => b.date - a.date);
      } catch (e) {
        console.error('IndexedDB unavailable, working in memory only', e);
        toast.error('Saving is unavailable in this browser', {
          description: 'Documents will be lost when you close the page. Export anything you need.'
        });
      }

      const fixture = import.meta.env.DEV ? new URLSearchParams(location.search).get('data') : null;
      if (fixture === 'worst' || fixture === 'demo') {
        const mod = await import('./dev/worstCase');
        documents = [...(fixture === 'worst' ? mod.worstCaseDocuments() : mod.demoDocuments()), ...documents];
      }

      set({ documents, activeId: documents[0]?.id ?? null, ready: true });
      void get().retryAllPending();
    },

    setTab: (tab) => set({ tab }),

    openDocument: (id, tab = 'review') => set({ activeId: id, tab }),

    openKeyDialog: (reason = null) => set({ keyDialog: { open: true, reason } }),
    closeKeyDialog: () => set({ keyDialog: { open: false, reason: null } }),

    scanFiles: async (files) => {
      const images = files.filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
      if (images.length === 0) {
        toast.error('That is not an image', { description: 'Choose a JPG, PNG or HEIC photo of the document.' });
        return;
      }
      if (images.length < files.length) toast(`Skipped ${formatCount(files.length - images.length, 'non-image file')}`);

      let lastId: string | null = null;
      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const position = { index: i + 1, total: images.length };
        set({ progress: { fileName: file.name, step: 1, label: 'Preparing image', ...position } });

        let prepared;
        try {
          prepared = await prepareImage(file);
        } catch {
          toast.error(`Could not open ${file.name}`);
          continue;
        }

        const id = `DOC-${Date.now().toString(36).toUpperCase()}${i}`;
        const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Scanned document';
        const record: ScanRecord = {
          id,
          title,
          fileName: file.name,
          plotCode: '',
          forestStation: '',
          observerName: '',
          date: Date.now(),
          imageDataUrl: prepared.dataUrl,
          fileSizeBytes: prepared.sizeBytes,
          fileType: prepared.mimeType,
          syncStatus: 'SAVED_OFFLINE',
          isVerified: false,
          ocrStatus: 'pending',
          rows: []
        };

        // Save the photo first: if OCR fails, the tab closes or the network drops, nothing is lost.
        set((s) => ({ documents: [record, ...s.documents] }));
        await persist(record);
        lastId = id;

        const keepGoing = await runOcr(id, position);
        if (!keepGoing) break;
      }

      set({ progress: null });
      if (lastId) {
        const doc = byId(lastId);
        set({ activeId: lastId, tab: 'review' });
        if (doc && (doc.ocrStatus ?? 'done') === 'done') {
          toast.success(images.length > 1 ? `Read ${formatCount(images.length, 'page')}` : 'Document read', {
            description: `${formatCount(doc.rows.length, 'row')} extracted. Check the amber cells.`
          });
        }
      }
    },

    retryOcr: async (id) => {
      set({ progress: { fileName: byId(id)?.fileName || '', step: 1, label: 'Preparing image', index: 1, total: 1 } });
      await runOcr(id);
      set({ progress: null });
      const doc = byId(id);
      if (doc && (doc.ocrStatus ?? 'done') === 'done') toast.success('Document read');
    },

    retryAllPending: async () => {
      if (!navigator.onLine) return;
      const pending = get().documents.filter((d) => d.ocrStatus === 'pending' && d.imageDataUrl && !isEphemeral(d.id));
      if (pending.length === 0) return;
      for (let i = 0; i < pending.length; i++) {
        const keepGoing = await runOcr(pending[i].id, { index: i + 1, total: pending.length });
        if (!keepGoing) break;
      }
      set({ progress: null });
    },

    editCell: (docId, rowNumber, key, value) => mutate(docId, (d) => applyCellValue(d, rowNumber, key, value)),
    confirmCell: (docId, rowNumber, key) =>
      mutate(docId, (d) => {
        const row = d.rows.find((r) => r.rowNumber === rowNumber);
        return row ? applyCellValue(d, rowNumber, key, row.cells?.[key] ?? '') : d;
      }),
    addComment: (docId, rowNumber, key, text) =>
      mutate(docId, (d) => applyComment(d, rowNumber, key, 'Reviewer', text)),
    toggleComment: (docId, rowNumber, commentId) => mutate(docId, (d) => applyToggleComment(d, rowNumber, commentId)),
    verifyAll: (docId) => mutate(docId, applyVerifyAll),
    replaceDocument: (doc) => commit(doc),

    deleteDocument: async (id) => {
      const doc = byId(id);
      if (!doc) return;
      const remaining = get().documents.filter((d) => d.id !== id);
      set((s) => ({ documents: remaining, activeId: s.activeId === id ? (remaining[0]?.id ?? null) : s.activeId }));
      if (!isEphemeral(id)) {
        try {
          await db.scans.delete(id);
        } catch (e) {
          console.error(e);
        }
      }
      // Forgiveness over confirmation dialogs: deleting is instant, undoing is one tap.
      toast('Document deleted', {
        description: doc.title,
        duration: 8000,
        action: {
          label: 'Undo',
          onClick: async () => {
            set((s) => ({ documents: [doc, ...s.documents].sort((a, b) => b.date - a.date) }));
            await persist(doc);
          }
        }
      });
    }
  };
});

// Selector helpers kept next to the store so components stay declarative.
export const useActiveDoc = () => useStore((s) => s.documents.find((d) => d.id === s.activeId) ?? null);
