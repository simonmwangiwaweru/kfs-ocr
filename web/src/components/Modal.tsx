import type { ReactNode, RefObject } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Visually hide the title but keep it for screen readers (image viewer). */
  hideHeader?: boolean;
  wide?: boolean;
  children: ReactNode;
  footer?: ReactNode;
  /** Element to focus on open. Skipped on touch so the on-screen keyboard doesn't cover the sheet. */
  initialFocus?: RefObject<HTMLElement | null>;
}

/** Focus-trapped, escape-dismissable dialog. Centered on desktop, a bottom sheet on phones. */
export function Modal({ open, onOpenChange, title, description, hideHeader, wide, children, footer, initialFocus }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="dialog-backdrop" />
        <Dialog.Popup
          className={clsx('dialog-popup', wide && 'dialog-wide')}
          initialFocus={initialFocus ? (type: string) => (type === 'touch' ? false : (initialFocus.current ?? true)) : undefined}
        >
          <header
            className={clsx(
              'sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4',
              hideHeader && 'sr-only'
            )}
          >
            <div className="min-w-0">
              <Dialog.Title className="wrap-any text-base font-semibold text-slate-900">{title}</Dialog.Title>
              {description && (
                <Dialog.Description className="wrap-any mt-0.5 text-[13px] text-slate-500">{description}</Dialog.Description>
              )}
            </div>
            <Dialog.Close className="btn btn-ghost btn-icon btn-sm -mr-1.5 shrink-0" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          </header>

          {hideHeader && (
            <Dialog.Close className="btn btn-secondary btn-icon btn-sm absolute right-3 top-3 z-20" aria-label="Close">
              <X size={18} />
            </Dialog.Close>
          )}

          <div className={clsx(!hideHeader && 'px-5 py-4')}>{children}</div>

          {footer && <footer className="sticky bottom-0 border-t border-slate-100 bg-white/95 px-5 py-3">{footer}</footer>}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
