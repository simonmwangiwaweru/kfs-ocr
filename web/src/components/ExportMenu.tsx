import { Menu } from '@base-ui/react/menu';
import { toast } from 'sonner';
import { ChevronDown, ClipboardCopy, Download, FileSpreadsheet, FileType2, ImageIcon, Printer, Table2 } from 'lucide-react';
import clsx from 'clsx';
import type { ScanRecord } from '../db';
import { copyTable, exportCsv, exportImage, exportPdf, exportWord, exportXlsx } from '../lib/exporters';
import { isTranscribed } from '../lib/documents';

interface ExportMenuProps {
  doc: ScanRecord;
  /** "button" is the labelled primary action; "icon" is the compact version used in lists. */
  variant?: 'button' | 'icon';
}

export function ExportMenu({ doc, variant = 'button' }: ExportMenuProps) {
  const hasTable = isTranscribed(doc) && doc.rows.length > 0;

  const run = (fn: () => void | Promise<void>, message: string) => async () => {
    try {
      await fn();
      toast.success(message);
    } catch (e) {
      console.error(e);
      toast.error('Export failed', { description: (e as Error)?.message });
    }
  };

  return (
    <Menu.Root>
      <Menu.Trigger
        className={clsx(
          'btn',
          variant === 'button' ? 'btn-primary' : 'btn-secondary btn-icon btn-sm'
        )}
        aria-label={variant === 'icon' ? `Export ${doc.title}` : undefined}
      >
        <Download size={variant === 'icon' ? 15 : 16} />
        {variant === 'button' && (
          <>
            Export
            <ChevronDown size={15} className="-mr-1 opacity-80" />
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50 outline-none">
          <Menu.Popup className="menu-popup">
            <p className="eyebrow px-2.5 pb-1 pt-1.5">Table</p>
            <Menu.Item className="menu-item" disabled={!hasTable} onClick={run(() => exportXlsx(doc), 'Excel file downloaded')}>
              <FileSpreadsheet size={16} className="text-brand-600" /> Excel (.xlsx)
            </Menu.Item>
            <Menu.Item className="menu-item" disabled={!hasTable} onClick={run(() => exportCsv(doc), 'CSV file downloaded')}>
              <Table2 size={16} className="text-brand-600" /> CSV (.csv)
            </Menu.Item>
            <Menu.Item
              className="menu-item"
              disabled={!hasTable}
              onClick={async () => {
                const ok = await copyTable(doc);
                if (ok) toast.success('Table copied. Paste it into a spreadsheet.');
                else toast.error('Could not copy', { description: 'Your browser blocked clipboard access.' });
              }}
            >
              <ClipboardCopy size={16} className="text-brand-600" /> Copy table
            </Menu.Item>
            <Menu.Separator className="menu-sep" />
            <p className="eyebrow px-2.5 pb-1 pt-1.5">Report</p>
            <Menu.Item className="menu-item" disabled={!hasTable} onClick={run(() => exportPdf(doc), 'Choose "Save as PDF" in the print window')}>
              <Printer size={16} className="text-brand-600" /> PDF (print)
            </Menu.Item>
            <Menu.Item className="menu-item" disabled={!hasTable} onClick={run(() => exportWord(doc), 'Word document downloaded')}>
              <FileType2 size={16} className="text-brand-600" /> Word (.doc)
            </Menu.Item>
            <Menu.Separator className="menu-sep" />
            <Menu.Item
              className="menu-item"
              disabled={!doc.imageDataUrl}
              onClick={run(() => {
                if (!exportImage(doc)) throw new Error('This document has no saved photo.');
              }, 'Photo downloaded')}
            >
              <ImageIcon size={16} className="text-brand-600" /> Original photo
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
