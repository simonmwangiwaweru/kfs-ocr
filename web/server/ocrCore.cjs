// Shared OCR processing core used by both Vercel serverless (/api/ocr.js)
// and Vite dev/preview middleware (web/vite.config.ts).
// Keeps GEMINI_API_KEY on the server and enforces strict zero-hallucination extraction.

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert OCR & Document Digitization Engine specialized in Kenya Forest Service (KFS) / KEFRI Stumpage Appraisal Forms (Form No. AGW-85-01) and field tree measurement sheets.

Analyze the provided document image or PDF carefully.

1. ORIENTATION & ALIGNMENT (CRITICAL):
   - Uploaded photographs or scans may be rotated 90 degrees clockwise/counter-clockwise or upside down.
   - ALWAYS locate the printed header text ("STUMPAGE APPRAISAL FORMS", "COMPARTMENT", "SPECIES", "DATE", "NAME OF MEASURING OFFICER") and the "ROW" (1 to 10) and "COLUMN" (1 to 19) grid axes first to orient yourself before reading any cells.

2. DOCUMENT & HEADER METADATA EXTRACTION:
   - Read ONLY what is actually written or printed on THIS document. NEVER guess or copy placeholder values.
   - If a field is illegible or absent, set its value to "" (empty string).
   - Extract into metadataFields (and matching top-level fields):
     * Forest Station (from "STUMPAGE APPRAISAL FORMS......." line)
     * Compartment (from "COMPARTMENT......." line)
     * Species (from "SPECIES......." line)
     * Planting Year (from "PLANTING YEAR......." line)
     * Age (from "AGE......." line)
     * Date (from "DATE......." line)
     * Measuring Officer (from "NAME OF MEASURING OFFICER......." line)
     * Portion (from "PORTION......." line)
     * Operation (e.g., "Clear Fell" or "Thinning", whichever is unmarked/selected or circled/underlined)
     * Classification / Product (e.g., "Timber", "Poles", etc. if written in margin/header)
     * Number of Trees (from "NUMBER OF TREES......." line)

3. DUAL-INK 10-ROW x 19-COLUMN MEASUREMENT MATRIX:
   - The table body has 10 numbered rows (Row 1 to Row 10) and 19 numbered columns (Column 1 to Column 19).
   - Inspect EVERY cell (Row 1..10, Col 1..19) individually from left to right:
     a) PRIMARY / BLUE INK ("c" array of 19 strings for Col 1 through Col 19):
        - Extract the main handwritten number written inside each cell in blue/dark ink.
        - If a column or cell on the physical sheet is genuinely blank/empty (for example, Col 19 if unused), put "" at that index. NEVER invent values.
     b) SECONDARY / RED INK ("h" array of 19 strings for Col 1 through Col 19):
        - Extract any red-ink numbers written inside or directly above each cell on this sheet (such as tree heights or red-ink tally numbers).
        - If a row has NO red-ink numbers anywhere, omit "h" for that row. Never fabricate red-ink numbers.
   - IGNORE printed micro sub-column index digits (tiny 1, 2, 3, 4... printed along the top grid rule) and diagonal strike-through lines.

4. HANDWRITING DISAMBIGUATION & STROKE GEOMETRY (CRITICAL):
   - **7 vs 9 DISAMBIGUATION**:
     * A handwritten '7' has a FLAT horizontal top roof and a straight/diagonal downward stem (no closed top loop).
     * A handwritten '9' has a curved, rounded, closed or semi-closed oval loop at the top.
     * Check every digit carefully: if the second digit has a flat horizontal bar and diagonal stem (e.g. "178", "274", "173"), transcribe '7', NOT '9'. Only transcribe '9' when a rounded upper loop is clearly visible.
   - **1 vs 7**: '1' is a single vertical stroke without a horizontal top roof; '7' has a clear horizontal top bar.
   - **4 vs 9**: '4' has sharp angular corners; '9' has a smooth rounded upper loop.
   - **3 vs 8**: '3' is open on the left; '8' has closed upper and lower loops.
   - Whenever a digit in a cell is genuinely ambiguous, faint, smudged, or crossed by a fold, record a lower confidence (< 0.85) in "cellConfidence" and list top candidate readings in "candidateValues" and "visibilityIssues".

5. ULTRA-COMPACT OUTPUT JSON SCHEMA (omit tableHeaders; include cellConfidence/candidateValues ONLY for uncertain cells < 0.85):
Return ONLY valid JSON matching this structure:
{
  "title": "string (e.g. KFS Form AGW-85-01 - <Compartment or File>)",
  "plotCode": "string (Compartment / Plot code or empty string)",
  "forestStation": "string (Forest Station name or empty string)",
  "observerName": "string (Measuring Officer name or empty string)",
  "summary": "string (1-sentence factual summary of the uploaded sheet)",
  "metadataFields": [
    { "label": "Forest Station", "value": "string" },
    { "label": "Compartment", "value": "string" },
    { "label": "Species", "value": "string" },
    { "label": "Planting Year", "value": "string" },
    { "label": "Age", "value": "string" },
    { "label": "Date", "value": "string" },
    { "label": "Measuring Officer", "value": "string" },
    { "label": "Portion", "value": "string" },
    { "label": "Operation", "value": "string" },
    { "label": "Classification", "value": "string" },
    { "label": "Number of Trees", "value": "string" }
  ],
  "visibilityIssues": [
    { "row": 1, "col": 1, "field": "DBH (Blue)", "issue": "string description" }
  ],
  "rows": [
    {
      "rowNumber": 1,
      "c": ["178", "165", "...19 items total..."],
      "h": ["", "", "...only if red ink exists on this row..."],
      "cellConfidence": { "col_1": 0.78 },
      "candidateValues": {
        "col_1": [
          { "value": "178", "probability": 0.82, "reason": "Flat top 7" },
          { "value": "198", "probability": 0.18, "reason": "Closed loop 9" }
        ]
      }
    }
  ]
}
`;

function findEnvCaseInsensitive(targetNames, env = {}) {
  const sources = [env, process.env];
  const lowerTargets = targetNames.map((n) => n.toLowerCase());

  for (const targetLower of lowerTargets) {
    for (const src of sources) {
      if (!src || typeof src !== 'object') continue;
      for (const [k, v] of Object.entries(src)) {
        if (
          k.toLowerCase() === targetLower &&
          typeof v === 'string' &&
          v.trim() &&
          v.trim() !== 'MY_GEMINI_API_KEY'
        ) {
          return v.trim();
        }
      }
    }
  }
  return '';
}

const ENGINE_VERSION = 'v4.2-turbo-flash';

async function fetchWithTimeout(url, options = {}, timeoutMs = 22000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function resolveKeys(env = {}) {
  const serverKey = findEnvCaseInsensitive(
    ['GEMINI_API_KEY', 'GOOGLE_API_KEY', 'VITE_GEMINI_API_KEY'],
    env
  );

  const serverVisionKey = findEnvCaseInsensitive(
    ['GOOGLE_VISION_API_KEY', 'VITE_GOOGLE_VISION_KEY'],
    env
  );

  const ocrSpaceKey = findEnvCaseInsensitive(
    ['OCR_SPACE_API_KEY', 'OCRSPACE_API_KEY'],
    env
  );

  return {
    geminiKey: serverKey,
    usingServerKey: Boolean(serverKey),
    visionKey: serverVisionKey,
    ocrSpaceKey
  };
}

function getOcrStatus(env = {}) {
  const { usingServerKey, visionKey, ocrSpaceKey } = resolveKeys(env);
  return {
    status: 200,
    json: {
      ok: true,
      engineVersion: ENGINE_VERSION,
      serverKeyConfigured: Boolean(usingServerKey || visionKey || ocrSpaceKey),
      geminiConfigured: usingServerKey,
      visionKeyConfigured: Boolean(visionKey),
      ocrSpaceConfigured: Boolean(ocrSpaceKey)
    }
  };
}

function buildGridFromSpatialTokens(tokens, fullText, engineLabel) {
  // Group numeric/alphanumeric tokens by vertical row band and sort left-to-right into up to 19 columns
  const numericTokens = tokens
    .filter((t) => t.text && /[0-9]/.test(t.text))
    .sort((a, b) => a.y - b.y);

  const rowBands = [];
  const rowTolerance = 18;
  for (const tok of numericTokens) {
    const band = rowBands.find((b) => Math.abs(b.avgY - tok.y) <= rowTolerance);
    if (band) {
      band.items.push(tok);
      band.avgY = band.items.reduce((s, it) => s + it.y, 0) / band.items.length;
    } else {
      rowBands.push({ avgY: tok.y, items: [tok] });
    }
  }

  // Pick up to 10 densest sequential bands (the 10×19 measurement rows)
  const dataBands = rowBands.filter((b) => b.items.length >= 2).slice(0, 10);
  const rows = Array.from({ length: 10 }, (_, idx) => {
    const band = dataBands[idx];
    const sortedItems = band ? [...band.items].sort((a, b) => a.x - b.x) : [];
    const cells = {};
    const heightCells = {};
    const cellConfidence = {};

    for (let c = 1; c <= 19; c++) {
      const key = `col_${c}`;
      const tok = sortedItems[c - 1];
      cells[key] = tok ? tok.text : '';
      heightCells[key] = '';
      cellConfidence[key] = tok ? 0.78 : 1.0;
    }

    return {
      rowNumber: idx + 1,
      cells,
      heightCells,
      cellConfidence,
      candidateValues: {}
    };
  });

  return formatExtractionResult({
    title: `KFS Stumpage Appraisal (${engineLabel})`,
    documentType: 'forestry_inventory',
    institution: 'Kenya Forest Service (KFS)',
    subHeader: `Extracted via ${engineLabel} — verify flagged cells against photo`,
    summary: (fullText || '').split(/\r?\n/).slice(0, 2).join(' ').trim(),
    metadataFields: [
      { label: 'Forest Station', value: '' },
      { label: 'Compartment', value: '' },
      { label: 'Species', value: '' },
      { label: 'Planting Year', value: '' },
      { label: 'Age', value: '' },
      { label: 'Date', value: '' },
      { label: 'Measuring Officer', value: '' }
    ],
    rows
  });
}

async function callGoogleCloudVision(base64Data, apiKey) {
  try {
    const res = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Data },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
          }
        ]
      })
    });
    if (!res.ok) return { text: '', tokens: [] };
    const data = await res.json();
    const annotation = data?.responses?.[0]?.fullTextAnnotation;
    const text = annotation?.text || '';
    const tokens = [];
    const pages = Array.isArray(annotation?.pages) ? annotation.pages : [];
    for (const page of pages) {
      for (const block of page.blocks || []) {
        for (const para of block.paragraphs || []) {
          for (const word of para.words || []) {
            const wordText = (word.symbols || []).map((s) => s.text || '').join('');
            const verts = word.boundingBox?.vertices || [];
            const avgX = verts.length ? verts.reduce((s, v) => s + (v.x || 0), 0) / verts.length : 0;
            const avgY = verts.length ? verts.reduce((s, v) => s + (v.y || 0), 0) / verts.length : 0;
            if (wordText) tokens.push({ text: wordText, x: avgX, y: avgY });
          }
        }
      }
    }
    return { text, tokens };
  } catch (err) {
    console.warn('Google Cloud Vision call failed:', err?.message || err);
    return { text: '', tokens: [] };
  }
}

async function callOcrSpaceStandalone(base64Data, mimeType, apiKey) {
  try {
    const form = new URLSearchParams();
    form.set('apikey', apiKey);
    form.set('base64Image', `data:${mimeType};base64,${base64Data}`);
    form.set('OCREngine', '2');
    form.set('isTable', 'true');
    form.set('isOverlayRequired', 'true');
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString()
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const parsedResult = data?.ParsedResults?.[0];
    if (!parsedResult || data?.IsErroredOnProcessing) return null;
    const tokens = [];
    for (const line of parsedResult?.TextOverlay?.Lines || []) {
      for (const w of line.Words || []) {
        if (w.WordText) {
          tokens.push({
            text: String(w.WordText).trim(),
            x: Number(w.Left) || 0,
            y: Number(w.Top) || 0
          });
        }
      }
    }
    return buildGridFromSpatialTokens(tokens, parsedResult.ParsedText || '', 'OCR.space Engine 2');
  } catch (err) {
    console.warn('OCR.space call failed:', err?.message || err);
    return null;
  }
}

function formatExtractionResult(parsed) {
  const headers = Array.isArray(parsed.tableHeaders) && parsed.tableHeaders.length === 19
    ? parsed.tableHeaders
    : Array.from({ length: 19 }, (_, i) => ({
        key: `col_${i + 1}`,
        label: `Col ${i + 1}`
      }));

  const rawRows = Array.isArray(parsed.rows) ? parsed.rows : [];
  const rows = [];

  for (let idx = 0; idx < Math.max(10, rawRows.length); idx++) {
    const r = rawRows[idx] || {};
    const rowNum = Number(r.rowNumber) || idx + 1;
    const cells = {};
    const heightCells = {};
    const cellConf = {};

    headers.forEach((h, colIdx) => {
      const rawVal = Array.isArray(r.c)
        ? r.c[colIdx]
        : (r.cells?.[h.key] ?? r[h.key] ?? '');
      const cleanVal = rawVal === null || rawVal === undefined ? '' : String(rawVal).trim();
      cells[h.key] = cleanVal;

      const rawH = Array.isArray(r.h)
        ? r.h[colIdx]
        : (r.heightCells?.[h.key] ?? r.heights?.[h.key] ?? '');
      const cleanH = rawH === null || rawH === undefined || rawH === 'undefined' || rawH === '-' || rawH === '—'
        ? ''
        : String(rawH).trim();
      heightCells[h.key] = cleanH;

      const confCandidate = r.cellConfidence?.[h.key] ?? r.confidence?.[h.key] ?? r.candidateValues?.[h.key]?.[0]?.probability;
      const conf = typeof confCandidate === 'number' && !Number.isNaN(confCandidate)
        ? Math.max(0, Math.min(1, confCandidate))
        : (cleanVal ? 0.95 : 1.0);
      cellConf[h.key] = conf;
    });

    const isUncertain = Object.values(cellConf).some((c) => c < 0.85);

    rows.push({
      rowNumber: rowNum,
      treeNumber: String(r.treeNumber || `Tree #${(rowNum - 1) * 19 + 1}`),
      speciesCode: r.speciesCode || '',
      dbhCm: cells.col_1 || r.dbhCm || '',
      heightM: heightCells.col_1 || r.heightM || '',
      healthStatus: r.healthStatus || '',
      notes: r.notes || '',
      cells,
      heightCells,
      cellConfidence: cellConf,
      candidateValues: r.candidateValues || {},
      confidence: {
        treeNumber: 0.98,
        speciesCode: 0.95,
        dbhCm: cellConf.col_1 ?? 0.95,
        heightM: 0.95
      },
      flags: {
        dbhUncertain: (cellConf.col_1 ?? 1.0) < 0.85,
        heightUncertain: isUncertain
      },
      comments: Array.isArray(r.comments) ? r.comments : [],
      isVerified: false
    });
  }

  const metadataFields = Array.isArray(parsed.metadataFields) ? parsed.metadataFields : [];
  const findMeta = (needle) =>
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

async function handleOcr(body = {}, env = {}) {
  const { geminiKey, visionKey, ocrSpaceKey } = resolveKeys(env);
  if (!geminiKey && !visionKey && !ocrSpaceKey) {
    return {
      status: 503,
      json: {
        ok: false,
        code: 'MISSING_API_KEY',
        error: 'Scanner service is not configured on the server yet. Please contact the site administrator.'
      }
    };
  }

  const rawDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl.trim() : '';
  let mimeType = typeof body.mimeType === 'string' ? body.mimeType.trim() : '';
  let base64Data = typeof body.base64Data === 'string' ? body.base64Data.trim() : '';

  if (rawDataUrl) {
    const match = rawDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    } else {
      base64Data = rawDataUrl;
    }
  }

  if (!base64Data) {
    return {
      status: 400,
      json: {
        ok: false,
        code: 'INVALID_IMAGE',
        error: 'No image or PDF data was provided to /api/ocr.'
      }
    };
  }

  if (!mimeType) {
    mimeType = 'image/jpeg';
  }

  let visionResult = { text: '', tokens: [] };
  let visionAnchorPrompt = '';
  if (visionKey && mimeType.startsWith('image/')) {
    visionResult = await callGoogleCloudVision(base64Data, visionKey);
    if (visionResult.text) {
      visionAnchorPrompt = `\n\n[STAGE 1 CLOUD VISION OCR TEXT ANCHOR]:\n${visionResult.text}\nCross-reference handwritten digits carefully while preserving exact grid row/column coordinates.\n`;
    }
  }

  // If Gemini key is absent, use configured non-AI OCR engine directly
  if (!geminiKey) {
    if (visionKey && visionResult.tokens.length > 0) {
      return {
        status: 200,
        json: {
          ok: true,
          model: 'google-cloud-vision',
          result: buildGridFromSpatialTokens(visionResult.tokens, visionResult.text, 'Google Cloud Vision')
        }
      };
    }
    if (ocrSpaceKey) {
      const ocrSpaceResult = await callOcrSpaceStandalone(base64Data, mimeType, ocrSpaceKey);
      if (ocrSpaceResult) {
        return {
          status: 200,
          json: {
            ok: true,
            model: 'ocr-space',
            result: ocrSpaceResult
          }
        };
      }
    }
    return {
      status: 502,
      json: {
        ok: false,
        code: 'OCR_FAILED',
        error: 'OCR extraction returned no readable table data.'
      }
    };
  }

  const baseGenerationConfig = {
    temperature: 0.05,
    response_mime_type: 'application/json',
    thinkingConfig: {
      thinkingLevel: 'low'
    }
  };

  function buildPayload(includeThinking) {
    const genCfg = includeThinking
      ? baseGenerationConfig
      : { temperature: 0.05, response_mime_type: 'application/json' };
    return {
      contents: [
        {
          parts: [
            { text: EXTRACTION_SYSTEM_PROMPT + visionAnchorPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: genCfg
    };
  }

  const FALLBACK_GEMINI_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash'
  ];

  function scoreGeminiModel(name) {
    const lower = name.toLowerCase();
    // Exclude deprecated 1.x / 2.x models, generic aliases, and non-multimodal specialized models
    if (
      /gemini-(1\.|2\.0|2\.5)/.test(lower) ||
      /embedding|aqa|imagen|veo|tts|audio|robotics|computer-use|lyria|gemma|deep-research/.test(lower)
    ) {
      return -1;
    }

    // Prefer fast, free-tier-eligible Gemini 3+ / 4+ Flash models first
    if (lower === 'gemini-3.8-flash') return 500;
    if (lower === 'gemini-3.6-flash') return 480;
    if (lower === 'gemini-3.5-flash-lite') return 460;
    if (lower === 'gemini-3-flash-preview') return 440;

    let score = 0;
    if (/gemini-4/.test(lower)) score += 350;
    else if (/gemini-3\./.test(lower)) score += 320;
    else if (/gemini-3/.test(lower)) score += 300;
    else return -1;

    if (lower.includes('flash')) score += 60;
    if (lower.includes('lite')) score -= 10;
    if (lower.includes('pro')) score += 10; // Pro ranked after Flash since free keys often lack Pro quota
    if (lower.includes('preview')) score -= 2;
    return score;
  }

  async function selectCandidateModels() {
    try {
      const res = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiKey)}`,
        {},
        3500
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.models) ? data.models : [];
        const live = list
          .filter(
            (m) =>
              Array.isArray(m?.supportedGenerationMethods) &&
              m.supportedGenerationMethods.includes('generateContent') &&
              typeof m?.name === 'string'
          )
          .map((m) => m.name.replace(/^models\//, ''))
          .filter((name) => scoreGeminiModel(name) > 0)
          .sort((a, b) => scoreGeminiModel(b) - scoreGeminiModel(a));

        if (live.length > 0) {
          return Array.from(new Set(live)).slice(0, 2);
        }
      } else {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = errBody?.error?.message || '';
        if (res.status === 400 && /api key/i.test(errMsg)) {
          return { fatal: { status: 401, json: { ok: false, code: 'INVALID_API_KEY', error: errMsg } } };
        }
        if (res.status === 401 || res.status === 403) {
          return { fatal: { status: res.status, json: { ok: false, code: 'AUTH_ERROR', error: errMsg } } };
        }
      }
    } catch {
      // Fall through to fast default model list
    }
    return FALLBACK_GEMINI_MODELS;
  }

  async function tryGenerateWithModel(model, includeThinking = true, timeoutMs = 22000) {
    const response = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(includeThinking))
      },
      timeoutMs
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiMsg = errorData?.error?.message || `Gemini API error ${response.status}: ${response.statusText}`;
      const status = response.status === 400 || response.status === 401 || response.status === 403 || response.status === 429
        ? response.status
        : 502;
      if (response.status === 400 && includeThinking && /thinking/i.test(apiMsg)) {
        return await tryGenerateWithModel(model, false, Math.max(12000, timeoutMs - 2000));
      }
      if (response.status === 400 && /api key/i.test(apiMsg)) {
        return { fatal: { status: 401, json: { ok: false, code: 'INVALID_API_KEY', error: apiMsg } } };
      }
      if (response.status === 401 || response.status === 403) {
        return { fatal: { status: response.status, json: { ok: false, code: 'AUTH_ERROR', error: apiMsg } } };
      }
      return { error: apiMsg, status };
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return { error: `Empty response received from ${model}.`, status: 502 };
    }

    const cleaned = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    const formatted = formatExtractionResult(parsed);

    return {
      success: {
        status: 200,
        json: {
          ok: true,
          model,
          result: formatted
        }
      }
    };
  }

  const startedAt = Date.now();
  const candidateResult = await selectCandidateModels();
  if (candidateResult && candidateResult.fatal) {
    return candidateResult.fatal;
  }
  const candidateModels = Array.isArray(candidateResult) ? candidateResult : FALLBACK_GEMINI_MODELS;

  const attemptErrors = [];
  let lastStatus = 502;

  for (const model of candidateModels) {
    const elapsed = Date.now() - startedAt;
    const remainingBudget = 48000 - elapsed;
    if (remainingBudget < 6000) break;

    try {
      const outcome = await tryGenerateWithModel(model, true, Math.min(24000, remainingBudget));
      if (outcome.fatal) {
        if (visionKey && visionResult.tokens.length > 0) {
          return {
            status: 200,
            json: {
              ok: true,
              model: 'google-cloud-vision',
              result: buildGridFromSpatialTokens(visionResult.tokens, visionResult.text, 'Google Cloud Vision')
            }
          };
        }
        return outcome.fatal;
      }
      if (outcome.success) return outcome.success;
      if (outcome.error) {
        attemptErrors.push(`${model}: ${outcome.error}`);
        lastStatus = outcome.status || 502;
      }
    } catch (err) {
      attemptErrors.push(`${model}: ${err?.message || String(err)}`);
    }
  }

  // Optional non-AI backup if user configured GOOGLE_VISION_API_KEY or OCR_SPACE_API_KEY
  if (visionKey && visionResult.tokens.length > 0) {
    return {
      status: 200,
      json: {
        ok: true,
        model: 'google-cloud-vision',
        result: buildGridFromSpatialTokens(visionResult.tokens, visionResult.text, 'Google Cloud Vision')
      }
    };
  }
  if (ocrSpaceKey) {
    const ocrSpaceResult = await callOcrSpaceStandalone(base64Data, mimeType, ocrSpaceKey);
    if (ocrSpaceResult) {
      return {
        status: 200,
        json: {
          ok: true,
          model: 'ocr-space',
          result: ocrSpaceResult
        }
      };
    }
  }

  return {
    status: lastStatus,
    json: {
      ok: false,
      code: 'OCR_FAILED',
      error: attemptErrors[0] || 'Failed to extract data with Gemini Vision.'
    }
  };
}

module.exports = {
  handleOcr,
  getOcrStatus,
  formatExtractionResult,
  EXTRACTION_SYSTEM_PROMPT
};
