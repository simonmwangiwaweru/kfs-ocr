// Gemini Multimodal Vision AI Integration for KFS Stumpage Appraisal Form (AGW-85-01)
// Primary path calls /api/ocr (Vercel Serverless / Vite Proxy) so GEMINI_API_KEY stays server-side.
// Never falls back to hardcoded sample data on scan failures.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface DocumentHeaderColumn {
  key: string;
  label: string;
}

export interface DocumentMetadataItem {
  label: string;
  value: string;
}

export interface CandidatePrediction {
  value: string;
  probability: number;
  reason?: string;
}

export interface GeminiRowExtraction {
  rowNumber: number;
  treeNumber: string;
  speciesCode: string;
  dbhCm: string;
  heightM: string;
  healthStatus: string;
  notes: string;
  cells?: Record<string, string>;
  heightCells?: Record<string, string>;
  cellConfidence?: Record<string, number>;
  candidateValues?: Record<string, CandidatePrediction[]>;
  confidence: {
    treeNumber: number;
    speciesCode: number;
    dbhCm: number;
    heightM: number;
  };
  flags: {
    dbhUncertain: boolean;
    heightUncertain: boolean;
  };
  comments: Array<{
    id: string;
    author: string;
    text: string;
    timestamp: number;
    isResolved: boolean;
  }>;
  isVerified?: boolean;
}

export interface GeminiExtractionResult {
  title: string;
  documentType: 'forestry_inventory' | 'tabular_form' | 'school_bulletin' | 'general_document';
  institution: string;
  subHeader: string;
  personName: string;
  idNumber: string;
  plotCode: string;
  forestStation: string;
  observerName: string;
  summary: string;
  metadataFields: DocumentMetadataItem[];
  tableHeaders: DocumentHeaderColumn[];
  visibilityIssues?: Array<{ row: number; col: number; field: string; issue: string }>;
  rows: GeminiRowExtraction[];
}

export interface OcrServerStatus {
  reachable: boolean;
  serverKeyConfigured: boolean;
  visionKeyConfigured: boolean;
}

const STORAGE_KEY = 'kfs_gemini_api_key';
const CLOUD_VISION_KEY = 'kfs_cloud_vision_key';

export function getStoredGeminiKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
  } catch {
    return '';
  }
}

export function saveStoredGeminiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save API key:', e);
  }
}

export function clearStoredGeminiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear API key:', e);
  }
}

export function getStoredCloudVisionKey(): string {
  try {
    return localStorage.getItem(CLOUD_VISION_KEY) || (import.meta as any).env?.VITE_GOOGLE_VISION_KEY || '';
  } catch {
    return '';
  }
}

export function saveStoredCloudVisionKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(CLOUD_VISION_KEY, trimmed);
    } else {
      localStorage.removeItem(CLOUD_VISION_KEY);
    }
  } catch (e) {
    console.error('Failed to save Vision key:', e);
  }
}

export async function checkOcrServerStatus(): Promise<OcrServerStatus> {
  try {
    const res = await fetch('/api/ocr', { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      return { reachable: false, serverKeyConfigured: false, visionKeyConfigured: false };
    }
    const data = await res.json().catch(() => ({}));
    return {
      reachable: true,
      serverKeyConfigured: Boolean(data?.serverKeyConfigured),
      visionKeyConfigured: Boolean(data?.visionKeyConfigured)
    };
  } catch {
    return { reachable: false, serverKeyConfigured: false, visionKeyConfigured: false };
  }
}

const PREFERRED_GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-pro-preview',
  'gemini-3.1-flash-lite-preview'
];

function scoreGeminiModel(name: string): number {
  const lower = name.toLowerCase();
  if (/embedding|aqa|imagen|veo|tts|audio|robotics|computer-use|lyria|gemma/.test(lower)) {
    return -1;
  }
  let score = 0;
  if (/gemini-(4|3\.9|3\.8|3\.6|3\.5|3\.1|3)/.test(lower)) score += 100;
  else if (/gemini-flash-latest|gemini-pro-latest/.test(lower)) score += 60;
  else if (/gemini-2\.5/.test(lower)) score += 20;
  if (lower.includes('flash')) score += 25;
  if (lower.includes('pro')) score += 20;
  if (lower.includes('lite')) score -= 5;
  if (lower.includes('preview')) score += 2;
  return score;
}

async function discoverFallbackModels(apiKey: string, triedSet: Set<string>): Promise<string[]> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    const list: Array<{ name?: string; supportedGenerationMethods?: string[] }> = Array.isArray(data?.models)
      ? data.models
      : [];
    return list
      .filter(
        (m) =>
          Array.isArray(m?.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent') &&
          typeof m?.name === 'string'
      )
      .map((m) => (m.name as string).replace(/^models\//, ''))
      .filter((name) => !triedSet.has(name) && scoreGeminiModel(name) > 0)
      .sort((a, b) => scoreGeminiModel(b) - scoreGeminiModel(a))
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function testGeminiApiKey(apiKey: string): Promise<boolean> {
  const trimmed = apiKey.trim();
  if (!trimmed) return false;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(trimmed)}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return false;
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.models) && data.models.length > 0;
  } catch {
    return false;
  }
}

// Keep encoded payload safely below Vercel's 4.5 MB serverless request body cap (~3.2 MB base64 dataUrl ≈ 2.4 MB binary)
const MAX_DATA_URL_CHARS = 3_100_000;

function encodeCanvasWithinBudget(sourceCanvas: HTMLCanvasElement): string {
  const qualitySteps = [0.9, 0.84, 0.78, 0.72, 0.65];
  for (const quality of qualitySteps) {
    const encoded = sourceCanvas.toDataURL('image/jpeg', quality);
    if (encoded.length <= MAX_DATA_URL_CHARS) {
      return encoded;
    }
  }

  // If still above budget (rare ultra-dense scan), gently downscale once and encode
  const scale = 0.8;
  const scaledCanvas = document.createElement('canvas');
  scaledCanvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  scaledCanvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));
  const ctx = scaledCanvas.getContext('2d');
  if (!ctx) {
    return sourceCanvas.toDataURL('image/jpeg', 0.65);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
  ctx.drawImage(sourceCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

  for (const quality of [0.85, 0.78, 0.7]) {
    const encoded = scaledCanvas.toDataURL('image/jpeg', quality);
    if (encoded.length <= MAX_DATA_URL_CHARS) {
      return encoded;
    }
  }
  return scaledCanvas.toDataURL('image/jpeg', 0.65);
}

function drawBitmapToCanvas(
  source: CanvasImageSource,
  srcWidth: number,
  srcHeight: number,
  maxEdge = 2400
): HTMLCanvasElement {
  let width = srcWidth;
  let height = srcHeight;
  if (width > height && width > maxEdge) {
    height = Math.round((height * maxEdge) / width);
    width = maxEdge;
  } else if (height >= width && height > maxEdge) {
    width = Math.round((width * maxEdge) / height);
    height = maxEdge;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

async function renderPdfFileToImageDataUrl(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const longestEdge = Math.max(baseViewport.width, baseViewport.height, 1);
    const scale = Math.min(3.5, Math.max(1.5, 2400 / longestEdge));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas is unavailable to render this PDF.');
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    return encodeCanvasWithinBudget(canvas);
  } finally {
    await pdf.destroy();
  }
}

// Handles large (10 MB+) PDFs and camera photos client-side before sending to /api/ocr
export async function prepareFileForOcr(
  file: File,
  onStepChange?: (step: string) => void
): Promise<string> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

  if (isPdf) {
    onStepChange?.(`Rendering ${sizeMb} MB PDF sheet into high-res scan...`);
    try {
      return await renderPdfFileToImageDataUrl(file);
    } catch (pdfErr) {
      console.warn('Client PDF canvas render failed, checking raw PDF size:', pdfErr);
      if (file.size <= 2_300_000) {
        return await readFileAsDataUrl(file);
      }
      throw new Error(
        `Could not render this ${sizeMb} MB PDF in the browser. Please re-save it as an unencrypted PDF or JPG/PNG photo.`
      );
    }
  }

  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(file.name)) {
    if (file.size > 2_500_000) {
      onStepChange?.(`Optimizing ${sizeMb} MB image for fast OCR...`);
    } else {
      onStepChange?.('Optimizing sheet image & checking alignment...');
    }

    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Could not decode image file.'));
        el.src = objectUrl;
      });
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const canvas = drawBitmapToCanvas(img, width, height, 2400);
      return encodeCanvasWithinBudget(canvas);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const fallbackUrl = await readFileAsDataUrl(file);
  if (fallbackUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(`File (${sizeMb} MB) exceeds the supported upload payload. Please upload a PDF, JPG, or PNG.`);
  }
  return fallbackUrl;
}

// Optimize camera/scanner photos so high-res handwriting stays sharp while staying safely below Vercel's 4.5MB limit
export async function prepareUploadForOcr(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = match ? match[1] : 'image/jpeg';

  if (mimeType === 'application/pdf') {
    if (dataUrl.length > MAX_DATA_URL_CHARS) {
      throw new Error('PDF exceeds the server payload limit. Upload the PDF file directly so the browser can render it at high resolution.');
    }
    return dataUrl;
  }

  if (!mimeType.startsWith('image/')) {
    return dataUrl;
  }

  if (dataUrl.length <= MAX_DATA_URL_CHARS) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        if (width <= 2400 && height <= 2400 && dataUrl.length < 2_400_000) {
          resolve(dataUrl);
          return;
        }
        const canvas = drawBitmapToCanvas(img, width, height, 2400);
        resolve(encodeCanvasWithinBudget(canvas));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = drawBitmapToCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height, 2400);
      resolve(encodeCanvasWithinBudget(canvas));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

const CLIENT_FALLBACK_PROMPT = `
You are an expert OCR & Document Digitization Engine specialized in Kenya Forest Service (KFS) / KEFRI Stumpage Appraisal Forms (Form No. AGW-85-01).
Analyze the provided document image or PDF carefully.
1. Scans may be rotated 90/180/270 degrees. Always locate the printed ROW (1..10) and COLUMN (1..19) axes and header fields first.
2. Read ONLY values physically written on THIS sheet. Never guess or reuse example values; use "" if a field or cell is empty.
3. Extract primary/blue ink cell entries into "cells" ("col_1".."col_19") and any red-ink entries written inside/above cells into "heightCells" ("col_1".."col_19"). Leave "" when no ink exists.
4. Strictly disambiguate '7' (flat horizontal top roof + downward diagonal stem, e.g. "178") vs '9' (closed rounded top loop, e.g. "198").
Return ONLY valid JSON with title, documentType, institution, subHeader, personName, idNumber, plotCode, forestStation, observerName, summary, metadataFields, tableHeaders (col_1..col_19), visibilityIssues, and rows (rowNumber 1..10 with cells, heightCells, cellConfidence, candidateValues).
`;

function normalizeClientResult(parsed: any): GeminiExtractionResult {
  const headers: DocumentHeaderColumn[] = Array.isArray(parsed.tableHeaders) && parsed.tableHeaders.length === 19
    ? parsed.tableHeaders
    : Array.from({ length: 19 }, (_, i) => ({
        key: `col_${i + 1}`,
        label: `Col ${i + 1}`
      }));

  const rawRows = Array.isArray(parsed.rows) ? parsed.rows : [];
  const rows: GeminiRowExtraction[] = [];

  for (let idx = 0; idx < Math.max(10, rawRows.length); idx++) {
    const r = rawRows[idx] || {};
    const rowNum = Number(r.rowNumber) || idx + 1;
    const cells: Record<string, string> = {};
    const heightCells: Record<string, string> = {};
    const cellConf: Record<string, number> = {};

    headers.forEach((h) => {
      const rawVal = r.cells?.[h.key] ?? r[h.key] ?? '';
      const cleanVal = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();
      cells[h.key] = cleanVal;

      const rawH = r.heightCells?.[h.key] ?? r.heights?.[h.key] ?? '';
      const cleanH = rawH === null || rawH === undefined || rawH === 'undefined' || rawH === '-' || rawH === '—'
        ? ''
        : String(rawH).trim();
      heightCells[h.key] = cleanH;

      const conf = r.cellConfidence?.[h.key] ?? r.confidence?.[h.key] ?? r.candidateValues?.[h.key]?.[0]?.probability;
      cellConf[h.key] = typeof conf === 'number' && !Number.isNaN(conf) ? conf : (cleanVal ? 0.95 : 1.0);
    });

    const isUncertain = Object.values(cellConf).some((c) => c < 0.85);
    rows.push({
      rowNumber: rowNum,
      treeNumber: String(r.treeNumber || `Tree #${(rowNum - 1) * 19 + 1}`),
      speciesCode: r.speciesCode || '',
      dbhCm: cells['col_1'] || r.dbhCm || '',
      heightM: heightCells['col_1'] || r.heightM || '',
      healthStatus: r.healthStatus || '',
      notes: r.notes || '',
      cells,
      heightCells,
      cellConfidence: cellConf,
      candidateValues: r.candidateValues || {},
      confidence: {
        treeNumber: 0.98,
        speciesCode: 0.95,
        dbhCm: cellConf['col_1'] ?? 0.95,
        heightM: 0.95
      },
      flags: {
        dbhUncertain: (cellConf['col_1'] ?? 1.0) < 0.85,
        heightUncertain: isUncertain
      },
      comments: r.comments || [],
      isVerified: false
    });
  }

  const metadataFields: DocumentMetadataItem[] = Array.isArray(parsed.metadataFields) ? parsed.metadataFields : [];
  const findMeta = (needle: string) =>
    metadataFields.find((m) => String(m?.label || '').toLowerCase().includes(needle))?.value || '';

  const forestStation = String(parsed.forestStation || findMeta('station') || '').trim();
  const plotCode = String(parsed.plotCode || findMeta('compartment') || findMeta('plot') || '').trim();
  const observerName = String(parsed.observerName || parsed.personName || findMeta('officer') || '').trim();

  return {
    title: String(parsed.title || (plotCode ? `Form AGW-85-01 - ${plotCode}` : 'KFS Stumpage Appraisal Form AGW-85-01')).trim(),
    documentType: parsed.documentType || 'forestry_inventory',
    institution: String(parsed.institution || 'Kenya Forest Service (KFS)').trim(),
    subHeader: String(parsed.subHeader || 'Stumpage Appraisal Tally Form AGW-85-01').trim(),
    personName: String(parsed.personName || observerName).trim(),
    idNumber: String(parsed.idNumber || 'AGW-85-01').trim(),
    plotCode,
    forestStation,
    observerName,
    summary: String(parsed.summary || '').trim(),
    metadataFields,
    tableHeaders: headers,
    visibilityIssues: Array.isArray(parsed.visibilityIssues) ? parsed.visibilityIssues : [],
    rows
  };
}

export async function extractWithGeminiVision(
  imageDataUrl: string,
  onStepChange?: (step: string) => void
): Promise<GeminiExtractionResult> {
  onStepChange?.('Optimizing sheet image & checking alignment...');
  const preparedDataUrl = await prepareUploadForOcr(imageDataUrl);

  const clientApiKey = getStoredGeminiKey();
  const clientVisionKey = getStoredCloudVisionKey();

  onStepChange?.('Running live Gemini Vision 10×19 OCR extraction...');

  try {
    const serverRes = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: preparedDataUrl,
        clientApiKey: clientApiKey || undefined,
        clientVisionKey: clientVisionKey || undefined
      })
    });

    const payload = await serverRes.json().catch(() => null);

    if (serverRes.ok && payload?.ok && payload?.result) {
      onStepChange?.('Structuring 10×19 dual-ink matrix...');
      return payload.result as GeminiExtractionResult;
    }

    // If /api/ocr exists and returned a clear error (e.g. MISSING_API_KEY, INVALID_API_KEY, OCR_FAILED)
    if (payload && payload.error) {
      const err = new Error(payload.error) as Error & { code?: string };
      err.code = payload.code || 'OCR_ERROR';
      throw err;
    }

    if (serverRes.status === 404) {
      if (!clientApiKey) {
        const err = new Error(
          'OCR endpoint /api/ocr returned 404 (not deployed). Push the latest code (including web/api/ocr.js), or paste your Gemini API key in Station Settings as an immediate backup.'
        ) as Error & { code?: string };
        err.code = 'ENDPOINT_404';
        throw err;
      }
    } else {
      throw new Error(`OCR service failed with HTTP ${serverRes.status}`);
    }
  } catch (err: any) {
    // Re-throw explicit API / key / 404 errors immediately instead of hiding them
    if (
      err?.code === 'MISSING_API_KEY' ||
      err?.code === 'INVALID_API_KEY' ||
      err?.code === 'AUTH_ERROR' ||
      err?.code === 'OCR_FAILED' ||
      err?.code === 'OCR_ERROR' ||
      (err?.code === 'ENDPOINT_404' && !clientApiKey)
    ) {
      throw err;
    }
    // Only fall through to direct browser REST call if /api/ocr is unreachable AND clientApiKey is available
    if (!clientApiKey) {
      throw new Error(err?.message || 'OCR endpoint unreachable and no Gemini API key configured in Station Settings.');
    }
  }

  // Direct client fallback only when /api/ocr is unavailable (404/static host) and user supplied a key
  if (!clientApiKey) {
    throw new Error('MISSING_API_KEY: Add GEMINI_API_KEY in Vercel Environment Variables or enter an API key in Station Settings.');
  }

  const match = preparedDataUrl.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = match ? match[1] : 'image/jpeg';
  const base64Data = match ? match[2] : preparedDataUrl;

  const requestPayload = {
    contents: [
      {
        parts: [
          { text: CLIENT_FALLBACK_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.05,
      response_mime_type: 'application/json'
    }
  };

  const tryClientModel = async (model: string): Promise<GeminiExtractionResult> => {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(clientApiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error(`Empty response received from ${model}`);

    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return normalizeClientResult(parsed);
  };

  const triedModels = new Set<string>();
  let lastError: Error | null = null;

  for (const model of PREFERRED_GEMINI_MODELS) {
    triedModels.add(model);
    try {
      return await tryClientModel(model);
    } catch (err: any) {
      lastError = err;
    }
  }

  const discoveredModels = await discoverFallbackModels(clientApiKey, triedModels);
  for (const model of discoveredModels) {
    triedModels.add(model);
    try {
      return await tryClientModel(model);
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error('Failed to process document with Gemini Vision.');
}
