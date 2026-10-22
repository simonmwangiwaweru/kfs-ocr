import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Check, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import clsx from 'clsx';
import { useStore } from '../store';
import { clearUserGeminiKey, getUserGeminiKey, saveUserGeminiKey, testGeminiApiKey } from '../ocr';
import { formatCount } from '../lib/format';
import { Modal } from './Modal';

/** "Reading settings": lets a person bring their own Gemini key when the shared one is missing or used up. */
export function KeyDialog() {
  const { open, reason } = useStore((s) => s.keyDialog);
  const close = useStore((s) => s.closeKeyDialog);
  const pending = useStore((s) => s.documents.filter((d) => d.ocrStatus === 'pending').length);

  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const saved = getUserGeminiKey();
    setValue(saved);
    setHasSaved(Boolean(saved));
    setShow(false);
    setResult(null);
  }, [open]);

  const test = async () => {
    setTesting(true);
    setResult(null);
    setResult(await testGeminiApiKey(value));
    setTesting(false);
  };

  const save = () => {
    const key = value.trim();
    if (key.length < 8) {
      setResult({ success: false, message: 'That does not look like a Gemini key. Paste the whole key from Google AI Studio.' });
      return;
    }
    saveUserGeminiKey(key);
    close();
    toast.success('Key saved on this device');
    void useStore.getState().retryAllPending();
  };

  const remove = () => {
    clearUserGeminiKey();
    setValue('');
    setHasSaved(false);
    setResult(null);
    toast('Key removed from this device');
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Reading settings"
      description="Handwriting is read by Google Gemini."
      initialFocus={inputRef}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={close}>
            {pending > 0 ? 'Not now' : 'Cancel'}
          </button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={!value.trim()}>
            <Check size={16} />
            {pending > 0 ? `Save key and read ${formatCount(pending, 'photo')}` : 'Save key'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {reason && (
          <div role="alert" className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3 text-[13px] text-amber-900">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p>{reason}</p>
          </div>
        )}

        <p className="text-sm text-slate-600">
          This site may already read documents for you. If it says a key is needed, or its shared limit is used up, add your own free key.{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Get a free key <ExternalLink size={12} />
          </a>
        </p>

        <div className="space-y-1.5">
          <label htmlFor="gemini-key" className="eyebrow block">
            Your Gemini API key
          </label>
          <div className="relative">
            <input
              id="gemini-key"
              ref={inputRef}
              type={show ? 'text' : 'password'}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setResult(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              placeholder="AIza…"
              className="input pr-11 font-mono"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm absolute right-1 top-1/2 -translate-y-1/2"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide key' : 'Show key'}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck size={13} className="text-brand-600" /> Stored only in this browser. It is sent to Google and nowhere else.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void test()} disabled={testing || !value.trim()}>
            {testing && <Loader2 size={14} className="spinner" />}
            {testing ? 'Testing…' : 'Test key'}
          </button>
          {hasSaved && (
            <button type="button" className="btn btn-ghost btn-danger btn-sm" onClick={remove}>
              Remove saved key
            </button>
          )}
        </div>

        {result && (
          <div
            role="status"
            className={clsx(
              'flex items-start gap-2 rounded-xl p-3 text-[13px]',
              result.success ? 'bg-brand-50 text-brand-900' : 'bg-red-50 text-red-900'
            )}
          >
            {result.success ? <Check size={15} className="mt-0.5 shrink-0 text-brand-600" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-600" />}
            <span className="wrap-any">{result.message}</span>
          </div>
        )}

        <details className="rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-600">
          <summary className="cursor-pointer px-3 py-2.5 font-semibold text-slate-800">For the site owner</summary>
          <div className="space-y-1.5 border-t border-slate-200 px-3 py-3">
            <p>
              To read documents for every visitor, add the key on the server. In Vercel, open <strong>Settings → Environment Variables</strong>, add{' '}
              <code className="rounded border border-slate-200 bg-white px-1 py-0.5 font-mono text-xs font-semibold text-slate-800">GEMINI_API_KEY</code>, then
              redeploy.
            </p>
            <p>The key stays on the server and is never sent to visitors' browsers.</p>
          </div>
        </details>
      </div>
    </Modal>
  );
}
