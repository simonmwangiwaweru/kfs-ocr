import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Camera,
  CheckCheck,
  CloudOff,
  FileText,
  Filter,
  ImageIcon,
  Loader2,
  Maximize2,
  RefreshCw,
  SkipForward,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import clsx from 'clsx';
import type { ScanRecord } from '../db';
import { useActiveDoc, useStore } from '../store';
import {
  countOpenComments,
  countUncertainCells,
  documentSubtitle,
  getCellInfo,
  getHeaders,
  isTranscribed,
  rowUncertainKeys,
  stepFlagged,
  type CellRef
} from '../lib/documents';
import { formatCount, formatDate, formatPercent } from '../lib/format';
import { CellInspector } from './CellInspector';
import { ExportMenu } from './ExportMenu';
import { Modal } from './Modal';
import { SafeImage } from './SafeImage';

const TYPE_LABEL: Record<NonNullable<ScanRecord['documentType']>, string> = {
  forestry_inventory: 'Forestry inventory',
  tabular_form: 'Tabular form',
  school_bulletin: 'School record',
  general_document: 'Document'
};

export function ReviewView() {
  const doc = useActiveDoc();
  if (!doc) return <NoDocument />;
  // Keyed so every document starts with a fresh filter, selection and pane.
  return isTranscribed(doc) ? <Transcribed key={doc.id} doc={doc} /> : <Untranscribed key={doc.id} doc={doc} />;
}

function NoDocument() {
  const setTab = useStore((s) => s.setTab);
  return (
    <div className="card mx-auto max-w-md px-8 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <FileText size={26} strokeWidth={1.75} />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">Nothing to review yet</h2>
      <p className="mt-1.5 text-sm text-slate-500">Scan a form and its table will appear here, with unclear handwriting flagged for you.</p>
      <button type="button" className="btn btn-primary mt-5" onClick={() => setTab('scan')}>
        <Camera size={16} /> Scan a form
      </button>
    </div>
  );
}

/* A photo that has been saved but not read yet (offline, no key, or the last attempt failed). */
function Untranscribed({ doc }: { doc: ScanRecord }) {
  const online = useStore((s) => s.online);
  const busy = useStore((s) => s.progress !== null);
  const retryOcr = useStore((s) => s.retryOcr);
  const openKeyDialog = useStore((s) => s.openKeyDialog);
  const failed = doc.ocrStatus === 'failed';

  return (
    <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="card overflow-hidden bg-slate-900">
        <SafeImage src={doc.imageDataUrl} alt="Saved photo of the document" className="max-h-[28rem] w-full object-contain" fallbackClassName="min-h-56" />
      </div>
      <div className="card flex flex-col justify-center p-6">
        <span className={clsx('flex h-11 w-11 items-center justify-center rounded-xl', failed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800')}>
          {failed ? <AlertTriangle size={20} /> : <CloudOff size={20} />}
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">{failed ? 'This photo could not be read' : 'Saved, waiting to be read'}</h2>
        <p className="wrap-any mt-1.5 text-sm text-slate-600">
          {failed
            ? doc.ocrError || 'Something went wrong while reading the handwriting.'
            : online
              ? 'The photo is safe on this device. Read it now, or add a Gemini key if reading is not set up yet.'
              : 'The photo is safe on this device. It will be read automatically when you are back online.'}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" disabled={!online || busy} onClick={() => void retryOcr(doc.id)}>
            {busy ? <Loader2 size={16} className="spinner" /> : <RefreshCw size={16} />}
            {failed ? 'Try again' : 'Read now'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => openKeyDialog(null)}>
            Reading settings
          </button>
        </div>
        {failed && <p className="mt-4 text-[13px] text-slate-500">A sharper photo, taken square-on in good light, usually fixes this.</p>}
      </div>
    </div>
  );
}

function Transcribed({ doc }: { doc: ScanRecord }) {
  const verifyAll = useStore((s) => s.verifyAll);
  const replaceDocument = useStore((s) => s.replaceDocument);

  const [target, setTarget] = useState<CellRef | null>(null);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [pane, setPane] = useState<'table' | 'photo'>('table');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [allMeta, setAllMeta] = useState(false);

  const headers = useMemo(() => getHeaders(doc), [doc]);
  const flagged = useMemo(() => countUncertainCells(doc), [doc]);
  const openNotes = useMemo(() => countOpenComments(doc), [doc]);
  const reviewedRows = doc.rows.filter((r) => r.isVerified).length;
  const subtitle = documentSubtitle(doc);

  const rows = useMemo(
    () => (onlyFlagged ? doc.rows.filter((r) => rowUncertainKeys(doc, r).length > 0) : doc.rows),
    [doc, onlyFlagged]
  );

  const meta = doc.metadataFields ?? [];
  const shownMeta = allMeta ? meta : meta.slice(0, 4);

  const goNext = () => {
    const next = stepFlagged(doc, target, 1);
    if (next) setTarget(next);
  };

  const onVerifyAll = async () => {
    const before = doc;
    await verifyAll(doc.id);
    toast.success(`${formatCount(flagged, 'flagged cell')} marked as reviewed`, {
      action: { label: 'Undo', onClick: () => void replaceDocument(before) }
    });
  };

  return (
    <div className="space-y-4">
      {/* Document header */}
      <section className="card p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="eyebrow">{TYPE_LABEL[doc.documentType ?? 'general_document']}</p>
            <h2 className="clamp-2 text-xl font-semibold text-slate-900" title={doc.title}>
              {doc.title}
            </h2>
            {subtitle && (
              <p className="truncate text-sm text-slate-500" title={subtitle}>
                {subtitle}
              </p>
            )}

            {shownMeta.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {shownMeta.map((m, i) => (
                  <span key={`${m.label}-${i}`} className="wrap-any max-w-full rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {m.label && <span>{m.label}: </span>}
                    <strong className="font-semibold text-slate-900">{m.value || '—'}</strong>
                  </span>
                ))}
                {meta.length > 4 && (
                  <button type="button" className="btn btn-ghost btn-sm !h-7" onClick={() => setAllMeta((v) => !v)}>
                    {allMeta ? 'Show less' : `+${meta.length - 4} more`}
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pt-1 tabular-nums">
              <span className="chip chip-neutral">{formatCount(doc.rows.length, 'row')}</span>
              {flagged > 0 ? (
                <span className="chip chip-warn">
                  <AlertTriangle size={12} /> {formatCount(flagged, 'cell')} to check
                </span>
              ) : (
                <span className="chip chip-ok">
                  <CheckCheck size={12} /> All reviewed
                </span>
              )}
              {openNotes > 0 && <span className="chip chip-neutral">{formatCount(openNotes, 'open note')}</span>}
              <span className="chip chip-neutral">Scanned {formatDate(doc.date)}</span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {flagged > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => void onVerifyAll()}>
                <CheckCheck size={16} /> Mark all reviewed
              </button>
            )}
            <ExportMenu doc={doc} />
          </div>
        </div>
      </section>

      {/* Phones show one pane at a time; large screens show both. */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 lg:hidden" role="group" aria-label="Choose what to show">
        {(['table', 'photo'] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={pane === p}
            onClick={() => setPane(p)}
            className={clsx(
              'press h-9 rounded-lg text-[13px] font-semibold',
              pane === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            )}
          >
            {p === 'table' ? 'Table' : 'Original photo'}
          </button>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Photo */}
        <section className={clsx('card p-3 lg:sticky lg:top-[calc(var(--nav-h)+1rem)]', pane !== 'photo' && 'hidden lg:block')}>
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="eyebrow flex items-center gap-1.5">
              <ImageIcon size={13} /> Original photo
            </h3>
            {doc.imageDataUrl && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhotoOpen(true)}>
                <Maximize2 size={14} /> Enlarge
              </button>
            )}
          </div>
          <div className="overflow-hidden rounded-xl bg-slate-900">
            {doc.imageDataUrl ? (
              <button type="button" className="block w-full" onClick={() => setPhotoOpen(true)} aria-label="Enlarge the photo">
                <SafeImage src={doc.imageDataUrl} alt="Photo of the scanned document" className="max-h-[68dvh] w-full select-none object-contain" fallbackClassName="min-h-48" />
              </button>
            ) : (
              <SafeImage alt="" fallbackClassName="min-h-48" />
            )}
          </div>
          <p className="mt-2 px-1 text-xs text-slate-500 tabular-nums">
            {reviewedRows} of {formatCount(doc.rows.length, 'row')} fully reviewed
          </p>
        </section>

        {/* Table */}
        <section className={clsx('card overflow-hidden', pane !== 'table' && 'hidden lg:block')}>
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2.5">
            <button
              type="button"
              aria-pressed={onlyFlagged}
              onClick={() => setOnlyFlagged((v) => !v)}
              className={clsx(
                'btn btn-sm',
                onlyFlagged ? 'bg-amber-100 text-amber-900' : 'btn-secondary'
              )}
            >
              <Filter size={14} /> Needs review
              <span className="tabular-nums">({flagged})</span>
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={flagged === 0} onClick={goNext}>
              <SkipForward size={14} /> Next flagged
            </button>
            <p className="ml-auto hidden text-xs text-slate-500 sm:block">Tap a cell to check, correct or add a note</p>
          </div>

          <div className="max-h-[70dvh] overflow-auto overscroll-contain">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col" className="sticky-col w-12">
                    #
                  </th>
                  {headers.map((h) => (
                    <th key={h.key} scope="col">
                      {h.label || h.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={headers.length + 1} className="px-4 py-10 text-center text-sm text-slate-500">
                      {onlyFlagged ? 'Nothing left to check. Nice work.' : 'No rows were found on this document.'}
                    </td>
                  </tr>
                )}
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <th scope="row" className="sticky-col px-3 py-2.5 text-left align-top font-mono text-xs font-medium leading-5 text-slate-400 tabular-nums">
                      {row.rowNumber}
                    </th>
                    {headers.map((h) => {
                      const info = getCellInfo(row, h.key);
                      const selected = target?.rowNumber === row.rowNumber && target.key === h.key;
                      return (
                        <td key={h.key}>
                          <button
                            type="button"
                            className="cell-btn"
                            data-uncertain={info.isUncertain}
                            data-selected={selected}
                            aria-label={`Row ${row.rowNumber}, ${h.label || h.key}: ${info.value || 'empty'}${
                              info.isUncertain ? `, flagged ${formatPercent(info.confidence)} confidence` : ''
                            }`}
                            onClick={() => setTarget({ rowNumber: row.rowNumber, key: h.key })}
                          >
                            <span className="flex flex-wrap items-start gap-x-2 gap-y-1">
                              <span className={clsx('min-w-0', !info.value && 'text-slate-300')}>{info.value || '—'}</span>
                              {info.isUncertain && (
                                <span className="chip chip-warn shrink-0 !px-1.5 !py-0 text-[10px] tabular-nums">
                                  {formatPercent(info.confidence)}
                                </span>
                              )}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <CellInspector doc={doc} target={target} onTargetChange={setTarget} onOpenPhoto={() => setPhotoOpen(true)} />

      <Modal open={photoOpen} onOpenChange={setPhotoOpen} title="Original photo" hideHeader wide>
        <div className="relative max-h-[88dvh] overflow-auto overscroll-contain bg-slate-900">
          <SafeImage
            src={doc.imageDataUrl}
            alt="Full-size photo of the scanned document"
            className={clsx('mx-auto block select-none', zoomed ? 'max-w-none' : 'max-h-[88dvh] max-w-full object-contain')}
            style={zoomed ? { width: '220%' } : undefined}
            fallbackClassName="min-h-64"
          />
          {/* Zero-height sticky wrapper: the button stays in view while the zoomed photo scrolls underneath. */}
          <div className="sticky bottom-3 left-0 z-20 -mt-11 h-11 px-3">
            <button type="button" className="btn btn-secondary btn-sm shadow-md" onClick={() => setZoomed((z) => !z)}>
              {zoomed ? <ZoomOut size={15} /> : <ZoomIn size={15} />} {zoomed ? 'Fit to screen' : 'Zoom in'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
