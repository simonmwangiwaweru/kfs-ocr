import { useRef, useState } from 'react';
import { Camera, Check, CloudOff, ImagePlus, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { formatCount } from '../lib/format';

const STEPS = ['Preparing image', 'Reading handwriting', 'Building table'];

export function ScanView() {
  const progress = useStore((s) => s.progress);
  const pending = useStore((s) => s.documents.filter((d) => d.ocrStatus === 'pending').length);
  const online = useStore((s) => s.online);
  const scanFiles = useStore((s) => s.scanFiles);
  const retryAllPending = useStore((s) => s.retryAllPending);

  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // lets the same photo be chosen twice in a row
    if (files.length) void scanFiles(files);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!progress) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (progress) return;
          const files = Array.from(e.dataTransfer.files ?? []);
          if (files.length) void scanFiles(files);
        }}
        className={clsx(
          'dropzone card flex min-h-[22rem] flex-col items-center justify-center px-6 py-10 text-center',
          dragging && 'border-brand-500 bg-brand-50/60 ring-4 ring-brand-100'
        )}
      >
        {progress ? (
          <div role="status" aria-live="polite" className="w-full max-w-xs text-left">
            <div className="mb-5 text-center">
              <h2 className="text-lg font-semibold text-slate-900">Reading your document</h2>
              <p className="wrap-any mt-1 truncate text-[13px] text-slate-500" title={progress.fileName}>
                {progress.total > 1 ? `Page ${progress.index} of ${progress.total} · ` : ''}
                {progress.fileName}
              </p>
            </div>
            <ol className="space-y-3">
              {STEPS.map((label, i) => {
                const n = i + 1;
                const state = n < progress.step ? 'done' : n === progress.step ? 'active' : 'todo';
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={clsx(
                        'step-dot flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                        state === 'done' && 'border-brand-600 bg-brand-600 text-white',
                        state === 'active' && 'border-brand-500 bg-brand-50 text-brand-700',
                        state === 'todo' && 'border-slate-200 bg-white text-slate-400'
                      )}
                      aria-hidden
                    >
                      {state === 'done' ? <Check size={14} strokeWidth={3} /> : state === 'active' ? <Loader2 size={14} className="spinner" /> : n}
                    </span>
                    <span className={clsx('text-sm', state === 'todo' ? 'text-slate-400' : 'font-medium text-slate-800')}>{label}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-center text-xs text-slate-500">Large photos can take up to a minute.</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Camera size={30} strokeWidth={1.75} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-slate-900">Scan a paper form</h2>
            <p className="mt-1.5 text-sm text-slate-500">
              Photograph the sheet, or drop photos here. Choose several photos to read them one after another.
            </p>

            <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button type="button" className="btn btn-primary h-11" onClick={() => cameraRef.current?.click()}>
                <Camera size={17} /> Take photo
              </button>
              <button type="button" className="btn btn-secondary h-11" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={17} /> Choose photos
              </button>
            </div>

            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
            <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={onPick} />
          </div>
        )}
      </div>

      {pending > 0 && !progress && (
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <CloudOff size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{formatCount(pending, 'photo')} waiting to be read</p>
            <p className="text-[13px] text-slate-500">
              {online ? 'Saved on this device. Read them now.' : 'Saved on this device. They will be read when you are back online.'}
            </p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!online} onClick={() => void retryAllPending()}>
            <RefreshCw size={14} /> Read now
          </button>
        </div>
      )}

      <div className="card p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Lightbulb size={16} className="text-brand-600" /> For the best result
        </h3>
        <ul className="mt-2 space-y-1.5 pl-6 text-[13px] leading-relaxed text-slate-600 [&>li]:list-disc">
          <li>Lay the sheet flat in good daylight, or use your phone torch. Avoid shadows across the grid.</li>
          <li>Keep every border of the table inside the frame, and hold the camera square to the page.</li>
          <li>Smudged or faint handwriting is flagged in amber so you can check it against the photo.</li>
        </ul>
      </div>
    </div>
  );
}
