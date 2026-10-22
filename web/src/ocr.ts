// Document OCR via Google Gemini.
//
// Two paths, chosen automatically:
//   1. The user pasted their own key (stored in this browser only)  -> call Google directly.
//   2. Otherwise                                                    -> POST /api/ocr, where the
//      server holds the key. The key is never part of the shipped JavaScript.

import ocrConfig from '../shared/ocr-config.json';
import type {
  CandidatePrediction,
  CellComment,
  DocumentHeaderColumn,
  DocumentMetadataItem,
  ScanRecord,
  ScanRow
} from './db';

export type OcrErrorCode = 'NO_API_KEY' | 'INVALID_API_KEY' | 'QUOTA_EXCEEDED' | 'OFFLINE' | 'FAILED';

export class OcrError extends Error {
  code: OcrErrorCode;
  constructor(code: OcrErrorCode, message?: string) {
    super(message || code);
    this.name = 'OcrError';
    this.code = code;
  }
}

export interface ExtractionResult {
  title: string;
  documentType: NonNullable<ScanRecord['documentType']>;
  institution: string;
  subHeader: string;
  personName: string;
  idNumber: string;
  summary: string;
  metadataFields: DocumentMetadataItem[];
  tableHeaders: DocumentHeaderColumn[];
  rows: ScanRow[];
  model: string;
}

/* ------------------------------------------------------------------ */
/* User-supplied key (optional)                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'kfs_gemini_api_key';

export function getUserGeminiKey(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim() ?? '';
    return stored.length > 5 ? stored : '';
  } catch {
    return '';
  }
}

export function saveUserGeminiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch {
    /* storage unavailable (private mode): the key just won't persist */
  }
}

export function clearUserGeminiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Image preparation                                                   */
/* ------------------------------------------------------------------ */

export interface PreparedImage {
  dataUrl: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Downscales a photo so it uploads quickly, fits the serverless body limit and takes less room in
 * IndexedDB. Phone photos are routinely 4-10 MB; 2000px on the long edge is plenty for OCR.
 */
export async function prepareImage(file: Blob, maxEdge = 2000, quality = 0.86): Promise<PreparedImage> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.fillStyle = '#ffffff'; // PNGs with transparency would otherwise turn black as JPEG
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { dataUrl, mimeType: 'image/jpeg', sizeBytes: dataUrlBytes(dataUrl) };
  } catch {
    // Formats the browser can't decode (e.g. HEIC on desktop Chrome): send the original bytes.
    const dataUrl = await readAsDataUrl(file);
    return { dataUrl, mimeType: file.type || 'image/jpeg', sizeBytes: dataUrlBytes(dataUrl) };
  }
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.round((base64.length * 3) / 4);
}

function splitDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return { mimeType: 'image/jpeg', base64: dataUrl };
  return { mimeType: match[1] || 'image/jpeg', base64: match[3] };
}

/* ------------------------------------------------------------------ */
/* Key test                                                            */
/* ------------------------------------------------------------------ */

export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
  const key = apiKey.trim();
  if (!key) return { success: false, message: 'Paste a key first.' };

  for (const model of ocrConfig.models) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'hi' }] }],
          generationConfig: { maxOutputTokens: 2 }
        })
      });
      if (res.ok) return { success: true, message: `Connected to Google Gemini (${model}).` };

      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${res.status}`;
      if (res.status === 400 || res.status === 401 || res.status === 403) {
        return { success: false, message: `Google rejected this key: ${msg}` };
      }
      if (res.status === 429) return { success: false, message: 'This key has hit its Google quota.' };
      // 404 etc.: that model isn't available to this key, try the next one
    } catch (e: any) {
      return { success: false, message: `Network error: ${e?.message || 'cannot reach Google'}` };
    }
  }
  return { success: false, message: 'No supported Gemini model responded for this key.' };
}

/* ------------------------------------------------------------------ */
/* Extraction                                                          */
/* ------------------------------------------------------------------ */

export async function extractDocument(
  imageDataUrl: string,
  fileName: string,
  onStep?: (step: number, label: string) => void
): Promise<ExtractionResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new OcrError('OFFLINE', 'No internet connection.');
  }

  const { mimeType, base64 } = splitDataUrl(imageDataUrl);
  const userKey = getUserGeminiKey();

  onStep?.(1, 'Preparing image');
  const { text, model } = userKey ? await callGoogleDirect(userKey, mimeType, base64, onStep) : await callServer(mimeType, base64, onStep);

  onStep?.(3, 'Building table');
  return parseExtraction(text, fileName, model);
}

async function callServer(
  mimeType: string,
  base64: string,
  onStep?: (step: number, label: string) => void
): Promise<{ text: string; model: string }> {
  onStep?.(2, 'Reading handwriting');
  let res: Response;
  try {
    res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mimeType })
    });
  } catch {
    throw new OcrError('OFFLINE', 'Cannot reach the server.');
  }

  const data = await res.json().catch(() => ({}));
  if (res.ok && data?.text) return { text: data.text, model: data.model || 'gemini' };

  switch (data?.code) {
    case 'NO_SERVER_KEY':
      throw new OcrError('NO_API_KEY', 'No Gemini key is configured.');
    case 'INVALID_API_KEY':
      throw new OcrError('INVALID_API_KEY', data.error);
    case 'QUOTA_EXCEEDED':
      throw new OcrError('QUOTA_EXCEEDED', data.error);
    case 'TOO_LARGE':
      throw new OcrError('FAILED', 'This photo is too large to upload. Try a smaller photo or lower camera resolution.');
    default:
      if (res.status === 413) {
        throw new OcrError('FAILED', 'This photo is too large to upload. Try a smaller photo or lower camera resolution.');
      }
      // A 404 means there is no /api route at all (static hosting): same remedy as a missing key.
      if (res.status === 404) throw new OcrError('NO_API_KEY', 'No OCR service is available here.');
      throw new OcrError('FAILED', data?.error || `The OCR service returned HTTP ${res.status}.`);
  }
}

async function callGoogleDirect(
  apiKey: string,
  mimeType: string,
  base64: string,
  onStep?: (step: number, label: string) => void
): Promise<{ text: string; model: string }> {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: ocrConfig.prompt }, { inline_data: { mime_type: mimeType, data: base64 } }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
  });

  let lastError: OcrError | null = null;

  for (const model of ocrConfig.models) {
    onStep?.(2, 'Reading handwriting');
    let res: Response;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body
      });
    } catch {
      throw new OcrError('OFFLINE', 'Cannot reach Google.');
    }

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
      if (text) return { text, model };
      lastError = new OcrError('FAILED', 'Gemini returned no text for this image.');
      continue;
    }

    const err = await res.json().catch(() => ({}));
    const message: string = err?.error?.message || res.statusText || `HTTP ${res.status}`;
    if (res.status === 429) throw new OcrError('QUOTA_EXCEEDED', message);
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      if (/API key|API_KEY|permission/i.test(message)) throw new OcrError('INVALID_API_KEY', message);
      throw new OcrError('FAILED', message);
    }
    lastError = new OcrError('FAILED', message); // 404 / 5xx: try the next model
  }

  throw lastError ?? new OcrError('FAILED', 'Gemini could not process this document.');
}

/* ------------------------------------------------------------------ */
/* Parsing                                                             */
/* ------------------------------------------------------------------ */

const DOCUMENT_TYPES = ['school_bulletin', 'forestry_inventory', 'tabular_form', 'general_document'] as const;

function parseJson(raw: string): any {
  let text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        /* fall through */
      }
    }
    throw new OcrError('FAILED', 'The OCR result was not valid JSON. Try scanning again with a clearer photo.');
  }
}

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const clamp01 = (n: unknown, fallback: number) => {
  const num = Number(n);
  return Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : fallback;
};

export function parseExtraction(raw: string, fileName: string, model = 'gemini'): ExtractionResult {
  const parsed = parseJson(raw);

  // Column keys must be unique, non-empty strings or cells collide.
  const headers: DocumentHeaderColumn[] = [];
  const seen = new Set<string>();
  const addHeader = (key: string, label?: string) => {
    let k = key || `col_${headers.length + 1}`;
    while (seen.has(k)) k = `${k}_`;
    seen.add(k);
    headers.push({ key: k, label: label || k });
    return k;
  };

  const keyAlias = new Map<string, string>(); // key as sent by the model -> deduplicated key
  (Array.isArray(parsed.tableHeaders) ? parsed.tableHeaders : []).forEach((h: any, i: number) => {
    const original = str(h?.key) || `col_${i + 1}`;
    const key = addHeader(original, str(h?.label));
    if (!keyAlias.has(original)) keyAlias.set(original, key);
  });

  const rawRows: any[] = Array.isArray(parsed.rows) ? parsed.rows : [];

  // The model sometimes returns cells for columns it never declared. Keep them rather than lose data.
  for (const r of rawRows) {
    for (const k of Object.keys(r?.cells ?? {})) {
      if (!keyAlias.has(k)) keyAlias.set(k, addHeader(k, k));
    }
  }

  const rows: ScanRow[] = rawRows.map((r, idx) => {
    const cells: Record<string, string> = {};
    const cellConfidence: Record<string, number> = {};
    const candidateValues: Record<string, CandidatePrediction[]> = {};

    for (const h of headers) cells[h.key] = '';
    for (const [k, v] of Object.entries(r?.cells ?? {})) {
      const key = keyAlias.get(k);
      if (key) cells[key] = str(v);
    }

    for (const [k, v] of Object.entries(r?.candidateValues ?? {})) {
      const key = keyAlias.get(k);
      if (!key || !Array.isArray(v)) continue;
      const list = (v as any[])
        .map((c) => ({ value: str(c?.value), probability: clamp01(c?.probability, 0), reason: str(c?.reason) || undefined }))
        .filter((c) => c.value)
        .sort((a, b) => b.probability - a.probability);
      if (list.length > 0) candidateValues[key] = list;
    }

    for (const h of headers) {
      const declared = Object.entries(r?.cellConfidence ?? {}).find(([k]) => keyAlias.get(k) === h.key)?.[1];
      cellConfidence[h.key] = clamp01(declared, candidateValues[h.key]?.[0]?.probability ?? 0.9);
    }

    const comments: CellComment[] = (Array.isArray(r?.comments) ? r.comments : [])
      .map((c: any, i: number): CellComment => ({
        id: `ai_${Date.now()}_${idx}_${i}`,
        author: 'Gemini',
        text: typeof c === 'string' ? c : str(c?.text),
        timestamp: Date.now(),
        isResolved: false
      }))
      .filter((c: CellComment) => c.text);

    return { rowNumber: idx + 1, cells, cellConfidence, candidateValues, reviewedCells: {}, comments };
  });

  const docType = DOCUMENT_TYPES.includes(parsed.documentType) ? parsed.documentType : 'general_document';
  const fallbackTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Scanned document';

  return {
    title: str(parsed.title) || fallbackTitle,
    documentType: docType,
    institution: str(parsed.institution),
    subHeader: str(parsed.subHeader),
    personName: str(parsed.personName),
    idNumber: str(parsed.idNumber),
    summary: str(parsed.summary),
    metadataFields: (Array.isArray(parsed.metadataFields) ? parsed.metadataFields : [])
      .map((m: any) => ({ label: str(m?.label), value: str(m?.value) }))
      .filter((m: DocumentMetadataItem) => m.label || m.value),
    tableHeaders: headers,
    rows,
    model
  };
}
