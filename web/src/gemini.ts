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
  ready: boolean;
  engineVersion?: string;
  geminiConfigured?: boolean;
  ocrSpaceConfigured?: boolean;
  visionKeyConfigured?: boolean;
}

// Ensure no legacy browser-stored API keys linger from earlier builds
export function clearLegacyClientKeys(): void {
  try {
    localStorage.removeItem('kfs_gemini_api_key');
    localStorage.removeItem('kfs_cloud_vision_key');
  } catch {
    // ignore storage access issues
  }
}

export async function checkOcrServerStatus(): Promise<OcrServerStatus> {
  try {
    const res = await fetch('/api/ocr', { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      return { reachable: false, ready: false };
    }
    const data = await res.json().catch(() => ({}));
    return {
      reachable: true,
      ready: Boolean(data?.serverKeyConfigured),
      engineVersion: typeof data?.engineVersion === 'string' ? data.engineVersion : undefined,
      geminiConfigured: Boolean(data?.geminiConfigured),
      ocrSpaceConfigured: Boolean(data?.ocrSpaceConfigured),
      visionKeyConfigured: Boolean(data?.visionKeyConfigured)
    };
  } catch {
    return { reachable: false, ready: false };
  }
}

// Keep image crisp for handwriting while keeping payload compact (~400-950 KB) for fast mobile upload & vision latency
const MAX_DATA_URL_CHARS = 1_400_000;

function encodeCanvasWithinBudget(sourceCanvas: HTMLCanvasElement): string {
  const qualitySteps = [0.84, 0.78, 0.72, 0.65];
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
  maxEdge = 1600
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
    const scale = Math.min(3.0, Math.max(1.25, 1600 / longestEdge));
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
      const canvas = drawBitmapToCanvas(img, width, height, 1600);
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
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = drawBitmapToCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height, 1600);
      resolve(encodeCanvasWithinBudget(canvas));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Create a lightweight archive copy (~80-160 KB) for IndexedDB so device storage never hits QuotaExceededError
export async function compressImageForStorage(dataUrl: string): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length <= 180_000) {
    return dataUrl;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = drawBitmapToCanvas(img, img.naturalWidth || img.width, img.naturalHeight || img.height, 1000);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function extractWithGeminiVision(
  imageDataUrl: string,
  onStepChange?: (step: string) => void
): Promise<GeminiExtractionResult> {
  onStepChange?.('Optimizing sheet image & checking alignment...');
  const preparedDataUrl = await prepareUploadForOcr(imageDataUrl);

  onStepChange?.('Running live 10×19 OCR extraction...');

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 55_000);

  let serverRes: Response;
  try {
    serverRes = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: preparedDataUrl
      }),
      signal: controller.signal
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('The scan took longer than 55 seconds and timed out. Please try a clearer or closer photo.');
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }

  const payload = await serverRes.json().catch(() => null);

  if (serverRes.ok && payload?.ok && payload?.result) {
    onStepChange?.('Structuring 10×19 dual-ink matrix...');
    return payload.result as GeminiExtractionResult;
  }

  if (payload && payload.error) {
    throw new Error(String(payload.error));
  }

  if (serverRes.status === 404) {
    throw new Error('Scanner server endpoint (/api/ocr) is not deployed yet.');
  }

  if (serverRes.status === 504) {
    throw new Error('Server scan timed out (504). Please try again with a slightly closer photo.');
  }

  throw new Error(`Scanner service returned HTTP ${serverRes.status}. Please try again.`);
}
