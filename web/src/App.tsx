import { useEffect, useMemo } from 'react';
import { Toaster } from 'sonner';
import { Archive, Camera, CloudOff, Settings2, Table2 } from 'lucide-react';
import clsx from 'clsx';
import { useActiveDoc, useStore, type Tab } from './store';
import { countUncertainCells, isTranscribed } from './lib/documents';
import { ScanView } from './components/ScanView';
import { ReviewView } from './components/ReviewView';
import { ArchiveView } from './components/ArchiveView';
import { KeyDialog } from './components/KeyDialog';

const TABS: { id: Tab; label: string; icon: typeof Camera }[] = [
  { id: 'scan', label: 'Scan', icon: Camera },
  { id: 'review', label: 'Review', icon: Table2 },
  { id: 'archive', label: 'Archive', icon: Archive }
];

export default function App() {
  const ready = useStore((s) => s.ready);
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const online = useStore((s) => s.online);
  const openKeyDialog = useStore((s) => s.openKeyDialog);
  const activeDoc = useActiveDoc();

  useEffect(() => {
    void useStore.getState().init();

    const goOnline = () => {
      useStore.setState({ online: true });
      void useStore.getState().retryAllPending(); // offline-first: send whatever was queued
    };
    const goOffline = () => useStore.setState({ online: false });
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const flagged = useMemo(() => (activeDoc && isTranscribed(activeDoc) ? countUncertainCells(activeDoc) : 0), [activeDoc]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="chrome sticky top-0 z-30 border-b border-slate-200/70 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src="/ic_kfs_logo.png" alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" draggable={false} />
            <div className="min-w-0 leading-tight">
              <h1 className="truncate text-[15px] font-semibold text-slate-900">KFS Inventory Scan</h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">Kenya Forestry Research Institute</p>
            </div>
          </div>

          {/* Tabs live in the header on larger screens, in the bottom bar on phones. */}
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => setTab(id)}
                className={clsx(
                  'press relative inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold',
                  tab === id ? 'bg-brand-50 text-brand-800' : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon size={16} />
                {label}
                {id === 'review' && flagged > 0 && <span className="chip chip-warn !px-1.5 !py-0 text-[10px] tabular-nums">{flagged}</span>}
              </button>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {!online && (
              <span className="chip chip-warn" role="status">
                <CloudOff size={12} /> Offline
              </span>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openKeyDialog(null)} aria-label="Reading settings">
              <Settings2 size={16} />
              <span className="hidden sm:inline">Reading</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:pb-10">
        {!ready ? null : tab === 'scan' ? <ScanView /> : tab === 'review' ? <ReviewView /> : <ArchiveView />}
      </main>

      <nav
        aria-label="Main"
        className="chrome fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
              className={clsx(
                'press relative flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold',
                tab === id ? 'text-brand-700' : 'text-slate-500'
              )}
            >
              <Icon size={21} strokeWidth={tab === id ? 2.25 : 1.75} />
              {label}
              {id === 'review' && flagged > 0 && (
                <span className="absolute right-[calc(50%-1.75rem)] top-1.5 min-w-4 rounded-full bg-amber-500 px-1 text-center text-[10px] font-bold leading-4 text-white tabular-nums">
                  {flagged > 99 ? '99+' : flagged}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <KeyDialog />
      <Toaster
        position="top-center"
        theme="light"
        richColors
        offset={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
      />
    </div>
  );
}
