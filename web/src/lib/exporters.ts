import type { ScanRecord } from '../db';
import { escapeHtml, getCellValue, getHeaders, safeFileName } from './documents';
import { formatDate } from './format';

const BRAND = '#1F4D37';

function table(doc: ScanRecord) {
  const headers = getHeaders(doc);
  return {
    head: headers.map((h) => h.label),
    body: doc.rows.map((row) => headers.map((h) => getCellValue(row, h.key)))
  };
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------ CSV / XLSX ------------------------------ */

/** Quotes a field and neutralises spreadsheet formulas ("=1+1", "@SUM(...)") so a scanned cell can't execute. */
function csvField(value: string): string {
  const guarded = /^[=@]|^[+-](?![\d.])/.test(value) ? `'${value}` : value;
  return `"${guarded.replace(/"/g, '""')}"`;
}

export function exportCsv(doc: ScanRecord) {
  const { head, body } = table(doc);
  const lines = [head, ...body].map((cells) => cells.map(csvField).join(','));
  // BOM so Excel reads UTF-8 (accents, non-Latin names) correctly.
  download(new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${safeFileName(doc)}.csv`);
}

// SheetJS is ~400 kB: load it only when someone actually exports to Excel.
export async function exportXlsx(doc: ScanRecord) {
  const XLSX = await import('xlsx');
  const { head, body } = table(doc);
  const wb = XLSX.utils.book_new();

  const data = XLSX.utils.aoa_to_sheet([head, ...body]);
  data['!cols'] = head.map((label, i) => ({
    wch: Math.min(48, Math.max(label.length, ...body.map((r) => r[i].length), 6) + 2)
  }));
  XLSX.utils.book_append_sheet(wb, data, 'Data');

  const info: string[][] = [
    ['Title', doc.title],
    ...(doc.institution ? [['Institution', doc.institution]] : []),
    ...(doc.subHeader ? [['Sub-heading', doc.subHeader]] : []),
    ...(doc.personName ? [['Name', doc.personName]] : []),
    ...(doc.idNumber ? [['Reference', doc.idNumber]] : []),
    ...(doc.metadataFields ?? []).map((m) => [m.label, m.value]),
    ['Scanned', formatDate(doc.date)],
    ['Reviewed', doc.isVerified ? 'Yes' : 'No']
  ];
  const meta = XLSX.utils.aoa_to_sheet(info);
  meta['!cols'] = [{ wch: 18 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, meta, 'Document');

  XLSX.writeFile(wb, `${safeFileName(doc)}.xlsx`);
}

/* ---------------------------- Word / PDF report ---------------------------- */

function reportHtml(doc: ScanRecord, mode: 'word' | 'print'): string {
  const { head, body } = table(doc);
  const e = escapeHtml;

  const meta = (doc.metadataFields ?? [])
    .map((m) => `<div><strong>${e(m.label)}</strong> ${e(m.value)}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html${mode === 'word' ? " xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'" : ''}>
<head>
<meta charset="utf-8">
<title>${e(doc.title)}</title>
<style>
  @page { size: ${mode === 'print' ? 'A4 portrait' : 'auto'}; margin: 14mm; }
  body { font-family: Calibri, "Segoe UI", Arial, sans-serif; color: #0f172a; font-size: 11pt; line-height: 1.4; margin: ${mode === 'word' ? '30px' : '0'}; }
  .org { color: ${BRAND}; font-size: 10pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin: 0; }
  .sub { color: #64748b; font-size: 10pt; margin: 2px 0 0; }
  h1 { font-size: 17pt; margin: 14px 0 4px; letter-spacing: -.01em; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 10pt; margin: 12px 0 16px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { background: ${BRAND}; color: #fff; text-align: left; padding: 7px 9px; border: 1px solid ${BRAND}; }
  td { padding: 6px 9px; border: 1px solid #cbd5e1; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .foot { margin-top: 22px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 9pt; }
</style>
</head>
<body>
  ${doc.institution ? `<p class="org">${e(doc.institution)}</p>` : ''}
  ${doc.subHeader ? `<p class="sub">${e(doc.subHeader)}</p>` : ''}
  <h1>${e(doc.title)}</h1>
  ${doc.personName ? `<div class="sub">${e(doc.personName)}${doc.idNumber ? ` · ${e(doc.idNumber)}` : ''}</div>` : ''}
  ${meta ? `<div class="meta">${meta}</div>` : ''}
  <table>
    <thead><tr>${head.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead>
    <tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <div class="foot">Digitized ${e(formatDate(doc.date))}${doc.isVerified ? ' · Reviewed' : ' · Not yet fully reviewed'}</div>
</body>
</html>`;
}

export function exportWord(doc: ScanRecord) {
  download(
    new Blob(['﻿', reportHtml(doc, 'word')], { type: 'application/msword;charset=utf-8' }),
    `${safeFileName(doc)}.doc`
  );
}

/** Prints through a hidden iframe: no popup for the browser to block, and the user picks "Save as PDF". */
export function exportPdf(doc: ScanRecord) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = reportHtml(doc, 'print');
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60_000);
  };
  document.body.appendChild(frame);
}

/* ------------------------------ Image / clipboard ------------------------------ */

export function exportImage(doc: ScanRecord): boolean {
  if (!doc.imageDataUrl) return false;
  const link = document.createElement('a');
  link.href = doc.imageDataUrl;
  const ext = /^data:image\/(png|webp)/.test(doc.imageDataUrl) ? RegExp.$1 : 'jpg';
  link.download = `${safeFileName(doc, '_scan')}.${ext}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

export async function copyTable(doc: ScanRecord): Promise<boolean> {
  const { head, body } = table(doc);
  const clean = (v: string) => v.replace(/[\t\r\n]+/g, ' ');
  const text = [head, ...body].map((r) => r.map(clean).join('\t')).join('\n');
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
