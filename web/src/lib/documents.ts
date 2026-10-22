import type { CandidatePrediction, CellComment, DocumentHeaderColumn, ScanRecord, ScanRow } from '../db';

/** Cells read with less confidence than this are flagged for a person to check. */
export const UNCERTAIN_BELOW = 0.85;

const LEGACY_COLUMNS: DocumentHeaderColumn[] = [
  { key: 'treeNumber', label: 'Item #' },
  { key: 'speciesCode', label: 'Description' },
  { key: 'dbhCm', label: 'Value 1' },
  { key: 'heightM', label: 'Value 2' },
  { key: 'healthStatus', label: 'Status' },
  { key: 'notes', label: 'Remarks' }
];

export function getHeaders(doc: ScanRecord): DocumentHeaderColumn[] {
  return doc.tableHeaders && doc.tableHeaders.length > 0 ? doc.tableHeaders : LEGACY_COLUMNS;
}

export function getCellValue(row: ScanRow, key: string): string {
  const fromCells = row.cells?.[key];
  if (fromCells !== undefined) return String(fromCells);
  const legacy = (row as unknown as Record<string, unknown>)[key];
  return typeof legacy === 'string' ? legacy : '';
}

export interface CellInfo {
  key: string;
  value: string;
  confidence: number;
  candidates: CandidatePrediction[];
  isUncertain: boolean;
  isReviewed: boolean;
  comments: CellComment[];
}

// Older saves tracked confidence on four fixed fields; the table columns that map to them depend on the doc.
const LEGACY_CONFIDENCE_KEYS: Record<string, keyof NonNullable<ScanRow['confidence']>> = {
  treeNumber: 'treeNumber',
  speciesCode: 'speciesCode',
  dbhCm: 'dbhCm',
  heightM: 'heightM'
};

function legacyFlag(row: ScanRow, key: string): boolean {
  if (!row.flags) return false;
  if (key === 'dbhCm' || key === 'col_p1') return row.flags.dbhUncertain;
  if (key === 'heightM' || key === 'col_exam1') return row.flags.heightUncertain;
  return false;
}

export function getCellInfo(row: ScanRow, key: string): CellInfo {
  const candidates = row.candidateValues?.[key] ?? [];
  const legacyKey = LEGACY_CONFIDENCE_KEYS[key];
  const confidence =
    row.cellConfidence?.[key] ??
    (legacyKey ? row.confidence?.[legacyKey] : undefined) ??
    candidates[0]?.probability ??
    1;
  const isReviewed = Boolean(row.reviewedCells?.[key]);
  const isUncertain = !isReviewed && (confidence < UNCERTAIN_BELOW || legacyFlag(row, key));
  // Notes written before cells had their own thread have no key; show them on every cell of the row.
  const comments = (row.comments ?? []).filter((c) => !c.cellKey || c.cellKey === key);
  return { key, value: getCellValue(row, key), confidence, candidates, isUncertain, isReviewed, comments };
}

export function countUncertainCells(doc: ScanRecord): number {
  const headers = getHeaders(doc);
  let count = 0;
  for (const row of doc.rows) for (const h of headers) if (getCellInfo(row, h.key).isUncertain) count++;
  return count;
}

export function rowUncertainKeys(doc: ScanRecord, row: ScanRow): string[] {
  return getHeaders(doc)
    .map((h) => h.key)
    .filter((key) => getCellInfo(row, key).isUncertain);
}

export interface CellRef {
  rowNumber: number;
  key: string;
}

/** Every cell still waiting for a person, in reading order (row by row, left to right). */
export function flaggedCells(doc: ScanRecord): CellRef[] {
  const headers = getHeaders(doc);
  const out: CellRef[] = [];
  for (const row of doc.rows) {
    for (const h of headers) {
      if (getCellInfo(row, h.key).isUncertain) out.push({ rowNumber: row.rowNumber, key: h.key });
    }
  }
  return out;
}

/** The next (dir 1) or previous (dir -1) flagged cell relative to `from`, wrapping around. */
export function stepFlagged(doc: ScanRecord, from: CellRef | null, dir: 1 | -1 = 1): CellRef | null {
  const flagged = flaggedCells(doc);
  if (flagged.length === 0) return null;
  if (!from) return dir === 1 ? flagged[0] : flagged[flagged.length - 1];

  const headers = getHeaders(doc);
  const order = (c: CellRef) =>
    doc.rows.findIndex((r) => r.rowNumber === c.rowNumber) * headers.length + headers.findIndex((h) => h.key === c.key);
  const here = order(from);
  const candidates = dir === 1 ? flagged.filter((c) => order(c) > here) : flagged.filter((c) => order(c) < here).reverse();
  if (candidates.length > 0) return candidates[0];
  return dir === 1 ? flagged[0] : flagged[flagged.length - 1];
}

export function countOpenComments(doc: ScanRecord): number {
  return doc.rows.reduce((n, r) => n + (r.comments ?? []).filter((c) => !c.isResolved).length, 0);
}

export function isTranscribed(doc: ScanRecord): boolean {
  return (doc.ocrStatus ?? 'done') === 'done';
}

/* ------------------------------------------------------------------ */
/* Edits. Pure: each returns a new record, the store persists it.      */
/* ------------------------------------------------------------------ */

function withDerived(doc: ScanRecord): ScanRecord {
  const rows = doc.rows.map((row) => ({ ...row, isVerified: rowUncertainKeys(doc, row).length === 0 }));
  const isVerified = isTranscribed(doc) && rows.length > 0 && rows.every((r) => r.isVerified);
  return { ...doc, rows, isVerified };
}

export function applyCellValue(doc: ScanRecord, rowNumber: number, key: string, value: string): ScanRecord {
  const next: ScanRecord = {
    ...doc,
    rows: doc.rows.map((row) =>
      row.rowNumber !== rowNumber
        ? row
        : {
            ...row,
            cells: { ...(row.cells ?? {}), [key]: value },
            reviewedCells: { ...(row.reviewedCells ?? {}), [key]: true }
          }
    )
  };
  return withDerived(next);
}

export function applyComment(doc: ScanRecord, rowNumber: number, key: string, author: string, text: string): ScanRecord {
  const comment: CellComment = {
    id: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    author,
    text,
    timestamp: Date.now(),
    isResolved: false,
    cellKey: key
  };
  return {
    ...doc,
    rows: doc.rows.map((row) => (row.rowNumber === rowNumber ? { ...row, comments: [...(row.comments ?? []), comment] } : row))
  };
}

export function applyToggleComment(doc: ScanRecord, rowNumber: number, commentId: string): ScanRecord {
  return {
    ...doc,
    rows: doc.rows.map((row) =>
      row.rowNumber !== rowNumber
        ? row
        : { ...row, comments: row.comments.map((c) => (c.id === commentId ? { ...c, isResolved: !c.isResolved } : c)) }
    )
  };
}

export function applyVerifyAll(doc: ScanRecord): ScanRecord {
  const keys = getHeaders(doc).map((h) => h.key);
  const rows = doc.rows.map((row) => ({
    ...row,
    reviewedCells: { ...(row.reviewedCells ?? {}), ...Object.fromEntries(keys.map((k) => [k, true])) }
  }));
  return withDerived({ ...doc, rows });
}

/* ------------------------------------------------------------------ */
/* Naming & text                                                       */
/* ------------------------------------------------------------------ */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** File-system safe, ASCII-only name: "Bulletin de la 3ème" -> "Bulletin_de_la_3eme". */
export function safeFileName(doc: ScanRecord, suffix = ''): string {
  const base = (doc.personName || doc.title || 'document')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const day = new Date(doc.date).toISOString().slice(0, 10);
  return `${base || 'document'}_${day}${suffix}`;
}

/** Text shown as the document's secondary line; never an orphaned dash or empty string. */
export function documentSubtitle(doc: ScanRecord): string {
  return [doc.institution, doc.subHeader].filter(Boolean).join(' · ');
}
