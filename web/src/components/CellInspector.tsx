import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, ImageIcon, MessageSquare, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import type { ScanRecord } from '../db';
import { useStore } from '../store';
import { flaggedCells, getCellInfo, getHeaders, stepFlagged, type CellRef } from '../lib/documents';
import { formatCount, formatPercent, formatRelative } from '../lib/format';
import { Modal } from './Modal';
import { SafeImage } from './SafeImage';

interface Props {
  doc: ScanRecord;
  target: CellRef | null;
  onTargetChange: (target: CellRef | null) => void;
  onOpenPhoto: () => void;
}

export function CellInspector({ doc, target, onTargetChange, onOpenPhoto }: Props) {
  const { editCell, confirmCell, addComment, toggleComment } = useStore.getState();

  const row = target ? doc.rows.find((r) => r.rowNumber === target.rowNumber) : undefined;
  const header = target ? getHeaders(doc).find((h) => h.key === target.key) : undefined;
  const info = row && target ? getCellInfo(row, target.key) : null;

  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const valueRef = useRef<HTMLInputElement>(null);

  // Reset the form whenever the inspector lands on a different cell.
  const identity = target ? `${doc.id}:${target.rowNumber}:${target.key}` : '';
  useEffect(() => {
    setDraft(info?.value ?? '');
    setNote('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const open = Boolean(target && row && header && info);
  const flaggedCount = flaggedCells(doc).length;
  const changed = info ? draft !== info.value : false;

  const finish = async () => {
    if (!target || !info) return;
    const wasFlagged = info.isUncertain;
    if (changed) await editCell(doc.id, target.rowNumber, target.key, draft);
    else if (wasFlagged) await confirmCell(doc.id, target.rowNumber, target.key);

    // Read the fresh record: the store has just rewritten it.
    const fresh = useStore.getState().documents.find((d) => d.id === doc.id);
    if (wasFlagged && fresh) {
      const next = stepFlagged(fresh, target, 1);
      if (next) {
        onTargetChange(next); // keeps the review moving; no close/open animation between cells
        return;
      }
      toast.success('Every flagged cell is reviewed');
    }
    onTargetChange(null);
  };

  const jump = (dir: 1 | -1) => {
    const next = stepFlagged(doc, target, dir);
    if (next) onTargetChange(next);
  };

  const submitNote = async () => {
    const text = note.trim();
    if (!target || !text) return;
    await addComment(doc.id, target.rowNumber, target.key, text);
    setNote('');
  };

  const tone =
    !info ? '' : info.confidence >= 0.9 ? 'bg-brand-500' : info.confidence >= UNCERTAIN_TONE ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onTargetChange(null)}
      title={row && header ? `Row ${row.rowNumber} · ${header.label || header.key}` : 'Cell'}
      description="Check it against the photo, then confirm or correct."
      initialFocus={valueRef}
      footer={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => jump(-1)}
            disabled={flaggedCount === 0}
            aria-label="Previous flagged cell"
            title="Previous flagged cell"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            onClick={() => jump(1)}
            disabled={flaggedCount === 0}
            aria-label="Next flagged cell"
            title="Next flagged cell"
          >
            <ChevronRight size={18} />
          </button>
          <span className="hidden text-[13px] text-slate-500 sm:inline tabular-nums">
            {flaggedCount === 0 ? 'Nothing flagged' : `${formatCount(flaggedCount, 'cell')} to check`}
          </span>
          <button type="button" className="btn btn-primary ml-auto" onClick={() => void finish()}>
            <Check size={16} />
            {changed ? 'Save change' : info?.isUncertain ? 'Looks right' : 'Done'}
          </button>
        </div>
      }
    >
      {info && row && target && (
        <div className="space-y-5">
          {doc.imageDataUrl && (
            <button
              type="button"
              onClick={onOpenPhoto}
              className="group relative block w-full overflow-hidden rounded-xl bg-slate-900"
              aria-label="Open the full photo"
            >
              <SafeImage src={doc.imageDataUrl} alt="" className="mx-auto max-h-40 w-full select-none object-contain" fallbackClassName="min-h-24" />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                <ImageIcon size={12} /> Open full photo
              </span>
            </button>
          )}

          <section aria-label="Confidence" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Confidence</span>
              <span
                className={clsx(
                  'chip tabular-nums',
                  info.confidence >= 0.9 ? 'chip-ok' : info.confidence >= UNCERTAIN_TONE ? 'chip-warn' : 'chip-bad'
                )}
              >
                {formatPercent(info.confidence)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(info.confidence * 100)}>
              <div
                key={identity}
                className={clsx('meter-fill h-full w-full rounded-full', tone)}
                style={{ transform: `scaleX(${Math.max(0.02, info.confidence)})` }}
              />
            </div>
            {info.isUncertain && (
              <p className="flex items-start gap-1.5 text-[13px] text-amber-800">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span>The reader was not sure about this one. Compare it with the photo before accepting.</span>
              </p>
            )}
            {info.isReviewed && <p className="text-[13px] text-brand-700">You have already reviewed this cell.</p>}
          </section>

          {info.candidates.length > 0 && (
            <section aria-label="Other readings" className="space-y-2">
              <p className="eyebrow flex items-center gap-1.5">
                <Sparkles size={12} /> Other readings
              </p>
              <ul className="space-y-1.5">
                {info.candidates.map((c) => (
                  <li key={c.value}>
                    <button
                      type="button"
                      aria-pressed={draft === c.value}
                      onClick={() => setDraft(c.value)}
                      className={clsx(
                        'press flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left',
                        draft === c.value ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <span className="min-w-0">
                        <span className="wrap-any block font-mono text-sm font-semibold text-slate-900">{c.value}</span>
                        {c.reason && <span className="wrap-any block text-xs text-slate-500">{c.reason}</span>}
                      </span>
                      <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">{formatPercent(c.probability)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-1.5">
            <label htmlFor="cell-value" className="eyebrow block">
              Value
            </label>
            <input
              id="cell-value"
              ref={valueRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void finish()}
              className="input font-mono"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
            />
          </section>

          <section aria-label="Notes" className="space-y-2 border-t border-slate-100 pt-4">
            <p className="eyebrow flex items-center gap-1.5">
              <MessageSquare size={12} /> Notes
            </p>
            {info.comments.length > 0 && (
              <ul className="space-y-2">
                {info.comments.map((c) => (
                  <li key={c.id} className={clsx('rounded-xl bg-slate-50 px-3 py-2', c.isResolved && 'opacity-60')}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="wrap-any text-xs font-semibold text-slate-700">
                        {c.author} <span className="font-normal text-slate-400">· {formatRelative(c.timestamp)}</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void toggleComment(doc.id, target.rowNumber, c.id)}
                      >
                        {c.isResolved ? 'Reopen' : 'Resolve'}
                      </button>
                    </div>
                    <p className={clsx('wrap-any mt-0.5 text-sm text-slate-800', c.isResolved && 'line-through')}>{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void submitNote()}
                placeholder="e.g. Confirmed against the tree tag"
                aria-label="Add a note"
                className="input"
                maxLength={500}
              />
              <button type="button" className="btn btn-secondary" disabled={!note.trim()} onClick={() => void submitNote()}>
                Add
              </button>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}

const UNCERTAIN_TONE = 0.7;
