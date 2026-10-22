import { memo, useMemo, useState } from 'react';
import { Archive, Camera, FileText, Search, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import type { ScanRecord } from '../db';
import { useStore } from '../store';
import { countUncertainCells, documentSubtitle, isTranscribed } from '../lib/documents';
import { formatBytes, formatCount, formatRelative } from '../lib/format';
import { ExportMenu } from './ExportMenu';

type Filter = 'all' | 'review' | 'waiting';

function statusOf(doc: ScanRecord, flagged: number) {
  if (doc.ocrStatus === 'pending') return { label: 'Waiting to be read', tone: 'chip-warn' };
  if (doc.ocrStatus === 'failed') return { label: 'Could not read', tone: 'chip-bad' };
  if (doc.rows.length === 0) return { label: 'No rows found', tone: 'chip-neutral' };
  if (flagged > 0) return { label: `${formatCount(flagged, 'cell')} to check`, tone: 'chip-warn' };
  return { label: 'Reviewed', tone: 'chip-ok' };
}

function searchText(doc: ScanRecord) {
  return [
    doc.title,
    doc.institution,
    doc.subHeader,
    doc.personName,
    doc.idNumber,
    doc.fileName,
    ...(doc.metadataFields ?? []).map((m) => m.value)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function ArchiveView() {
  const documents = useStore((s) => s.documents);
  const setTab = useStore((s) => s.setTab);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const enriched = useMemo(
    () =>
      documents.map((doc) => ({
        doc,
        flagged: isTranscribed(doc) ? countUncertainCells(doc) : 0,
        haystack: searchText(doc)
      })),
    [documents]
  );

  const counts = {
    all: enriched.length,
    review: enriched.filter((e) => e.flagged > 0).length,
    waiting: enriched.filter((e) => !isTranscribed(e.doc)).length
  };

  const q = query.trim().toLowerCase();
  const visible = enriched.filter(
    (e) =>
      (filter === 'all' || (filter === 'review' ? e.flagged > 0 : !isTranscribed(e.doc))) && (!q || e.haystack.includes(q))
  );

  if (documents.length === 0) {
    return (
      <div className="card mx-auto max-w-md px-8 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Archive size={26} strokeWidth={1.75} />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Your archive is empty</h2>
        <p className="mt-1.5 text-sm text-slate-500">Every form you scan is kept here on this device, ready to review and export.</p>
        <button type="button" className="btn btn-primary mt-5" onClick={() => setTab('scan')}>
          <Camera size={16} /> Scan your first form
        </button>
      </div>
    );
  }

  const FILTERS: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'review', label: 'To check' },
    { id: 'waiting', label: 'Waiting' }
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Archive</h2>
          <p className="text-sm text-slate-500 tabular-nums">{formatCount(documents.length, 'document')} on this device</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, name or reference"
            aria-label="Search documents"
            className="input pl-9 pr-9"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1.5" role="group" aria-label="Filter documents">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={clsx(
              'press h-8 rounded-full px-3 text-[13px] font-semibold tabular-nums',
              filter === f.id ? 'bg-brand-700 text-white' : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            )}
          >
            {f.label} <span className={filter === f.id ? 'text-white/70' : 'text-slate-400'}>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-sm font-medium text-slate-800">No documents match</p>
          <p className="mt-1 text-[13px] text-slate-500">Try a different word, or clear the filter.</p>
          <button
            type="button"
            className="btn btn-secondary btn-sm mt-4"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            Clear search and filter
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map(({ doc, flagged }) => (
            <li key={doc.id}>
              <DocumentRow doc={doc} flagged={flagged} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const DocumentRow = memo(function DocumentRow({ doc, flagged }: { doc: ScanRecord; flagged: number }) {
  const openDocument = useStore((s) => s.openDocument);
  const deleteDocument = useStore((s) => s.deleteDocument);
  const status = statusOf(doc, flagged);
  const subtitle = documentSubtitle(doc);

  return (
    <div className="card flex items-stretch gap-1 p-2 transition-colors">
      <button
        type="button"
        onClick={() => openDocument(doc.id)}
        className="press flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 text-left hover:bg-slate-50"
        aria-label={`Open ${doc.title}`}
      >
        <Thumb src={doc.imageDataUrl} />
        <span className="min-w-0 flex-1">
          <span className="clamp-2 block text-[15px] font-semibold leading-snug text-slate-900" title={doc.title}>
            {doc.title}
          </span>
          {subtitle && (
            <span className="mt-0.5 block truncate text-[13px] text-slate-500" title={subtitle}>
              {subtitle}
            </span>
          )}
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 tabular-nums">
            <span className={clsx('chip', status.tone)}>{status.label}</span>
            {isTranscribed(doc) && <span>{formatCount(doc.rows.length, 'row')}</span>}
            <span>{formatRelative(doc.date)}</span>
            {doc.fileSizeBytes > 0 && <span className="hidden sm:inline">{formatBytes(doc.fileSizeBytes)}</span>}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 pr-1 sm:flex-row">
        <ExportMenu doc={doc} variant="icon" />
        <button
          type="button"
          className="btn btn-ghost btn-danger btn-icon btn-sm"
          aria-label={`Delete ${doc.title}`}
          onClick={() => void deleteDocument(doc.id)}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
});

function Thumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-16 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-slate-400">
      {src && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} onError={() => setFailed(true)} />
      ) : (
        <FileText size={20} />
      )}
    </span>
  );
}
