// Gemini Multimodal Vision AI Integration for Any Document, Form, or Sheet OCR
// Automatically detects document type (School Bulletin, Forestry Survey, Table Report, etc.)
// Extracts structured headers, candidate metadata, dynamic table columns, marks/measurements, and confidence.

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
  treeNumber: string; // Used as generic Item/Code/N°
  speciesCode: string; // Used as Subject/Description/Species
  dbhCm: string; // Primary measurement / P1 / Mark
  heightM: string; // Secondary measurement / P2 / Exam
  healthStatus: string; // Status / Mention / Health
  notes: string; // Remarks / Notes
  cells?: Record<string, string>; // Dynamic cell values for custom columns
  candidateValues?: Record<string, CandidatePrediction[]>; // Probability data for unclear / ambiguous text
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
  documentType: 'school_bulletin' | 'forestry_inventory' | 'tabular_form' | 'general_document';
  institution: string;
  subHeader: string;
  personName: string;
  idNumber: string;
  plotCode: string;
  forestStation: string;
  observerName: string;
  date: number;
  summary?: string;
  metadataFields: DocumentMetadataItem[];
  tableHeaders: DocumentHeaderColumn[];
  rows: GeminiRowExtraction[];
  isAiExtracted: boolean;
  modelUsed?: string;
}

const STORAGE_KEY = 'kfs_gemini_api_key';

export function getStoredGeminiKey(): string {
  try {
    const fromStorage = localStorage.getItem(STORAGE_KEY);
    if (fromStorage && fromStorage.trim().length > 5) {
      return fromStorage.trim();
    }
  } catch (_) {}
  
  // Check build / vite env
  const fromVite = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (fromVite && fromVite.trim().length > 5 && !fromVite.includes('MY_GEMINI_API_KEY')) {
    return fromVite.trim();
  }

  // Check process.env fallback
  try {
    const globalObj = globalThis as any;
    if (globalObj.process?.env?.GEMINI_API_KEY) {
      return String(globalObj.process.env.GEMINI_API_KEY).trim();
    }
  } catch (_) {}

  return '';
}

export function saveStoredGeminiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, key.trim());
  } catch (_) {}
}

export function clearStoredGeminiKey(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (_) {}
}

/**
 * Perform real Gemini Multimodal OCR on an image (base64 or data URL)
 */
export async function extractWithGeminiVision(
  imageDataUrl: string,
  fileName: string,
  onStatusUpdate?: (step: string) => void
): Promise<GeminiExtractionResult> {
  const apiKey = getStoredGeminiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  onStatusUpdate?.('1/3: Preparing image for Gemini Multimodal Vision AI...');

  let mimeType = 'image/jpeg';
  let base64Data = imageDataUrl;

  if (imageDataUrl.includes(';base64,')) {
    const parts = imageDataUrl.split(';base64,');
    mimeType = parts[0].replace('data:', '') || 'image/jpeg';
    base64Data = parts[1];
  }

  const prompt = `You are a professional Optical Character Recognition (OCR) and Document Digitization AI.
Transcribe and extract ALL text, tables, columns, rows, handwritten marks, and headers found directly in this uploaded image into structured JSON.
CRITICAL: Read ONLY what is actually written or printed in this specific image. Do NOT invent, assume, or substitute data from any other document. Keep the original language and spelling of the document.

Output STRICT JSON matching this schema:
{
  "documentType": "tabular_form" | "general_document" | "invoice" | "academic_record" | "inventory",
  "title": "Exact Title of the Document as written in the image",
  "institution": "Issuing organization, school, business, or ministry found in the image header",
  "subHeader": "Secondary subtitle, location, address, or branch if present",
  "personName": "Person, candidate, patient, or employee name if present",
  "idNumber": "Registration, reference, or invoice number if present",
  "dateString": "Date or period written on the document",
  "summary": "1-sentence summary of the document contents",
  "metadataFields": [
    { "label": "Header Field Name", "value": "Header Field Value" }
  ],
  "tableHeaders": [
    { "key": "col_1", "label": "First Column Name" },
    { "key": "col_2", "label": "Second Column Name" }
  ],
  "rows": [
    {
      "rowNumber": 1,
      "cells": {
        "col_1": "Cell Value",
        "col_2": "Cell Value"
      },
      "candidateValues": {
        "col_2": [
          { "value": "Most Likely Value", "probability": 0.85, "reason": "Clear handwriting strokes" },
          { "value": "Alternative Reading", "probability": 0.15, "reason": "Slight ink blur" }
        ]
      },
      "confidence": { "treeNumber": 0.95, "speciesCode": 0.95, "dbhCm": 0.95, "heightM": 0.95 },
      "flags": { "dbhUncertain": false, "heightUncertain": false },
      "comments": []
    }
  ]
}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1
    }
  };

  const modelsToTry = [
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-2.5-flash'
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      onStatusUpdate?.(`2/3: Recognizing handwriting & structure with Gemini (${model})...`);
      
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.status === 429) {
        throw new Error('QUOTA_EXCEEDED');
      }

      if (response.status === 400 || response.status === 403) {
        const errJson = await response.json().catch(() => ({}));
        const msg = errJson?.error?.message || '';
        if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
          throw new Error('INVALID_API_KEY');
        }
        if (msg.includes('quota') || msg.includes('Quota exceeded')) {
          throw new Error('QUOTA_EXCEEDED');
        }
      }

      if (!response.ok) {
        if (response.status === 404) continue;
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawText) {
        throw new Error('No OCR text generated');
      }

      onStatusUpdate?.('3/3: Formatting digitized document layout...');

      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleanJson);
      return sanitizeParsedResult(parsed, fileName);
    } catch (err: any) {
      if (err.message === 'QUOTA_EXCEEDED' || err.message === 'INVALID_API_KEY') {
        // Fall back gracefully to local intelligence
        console.warn("Gemini API key quota/auth error, using local document intelligence:", err.message);
        return recognizeDocumentLocal(imageDataUrl, fileName);
      }
      lastError = err;
    }
  }

  // Fallback to local recognizer if network fails
  return recognizeDocumentLocal(imageDataUrl, fileName);
}

function sanitizeParsedResult(parsed: any, fileName: string): GeminiExtractionResult {
  const docType = parsed.documentType || 'general_document';
  const tableHeaders: DocumentHeaderColumn[] = Array.isArray(parsed.tableHeaders) && parsed.tableHeaders.length > 0
    ? parsed.tableHeaders
    : defaultHeadersForType(docType);

  const rows: GeminiRowExtraction[] = Array.isArray(parsed.rows) ? parsed.rows.map((r: any, idx: number) => {
    const rowNum = typeof r.rowNumber === 'number' ? r.rowNumber : (idx + 1);
    const itemCode = String(r.treeNumber || r.itemNumber || rowNum).padStart(2, '0');
    const description = String(r.speciesCode || r.subject || r.description || 'Record ' + rowNum);
    const val1 = String(r.dbhCm || r.p1 || r.val1 || '—');
    const val2 = String(r.heightM || r.p2 || r.val2 || '—');
    const status = String(r.healthStatus || r.status || r.mention || 'Normal');
    const notes = String(r.notes || r.remarks || '');

    return {
      rowNumber: rowNum,
      treeNumber: itemCode,
      speciesCode: description,
      dbhCm: val1,
      heightM: val2,
      healthStatus: status,
      notes: notes,
      cells: r.cells || {
        [tableHeaders[0]?.key || 'col1']: itemCode,
        [tableHeaders[1]?.key || 'col2']: description,
        [tableHeaders[2]?.key || 'col3']: val1,
        [tableHeaders[3]?.key || 'col4']: val2,
        [tableHeaders[4]?.key || 'col5']: status,
        [tableHeaders[5]?.key || 'col6']: notes
      },
      confidence: {
        treeNumber: Number(r.confidence?.treeNumber ?? 0.95),
        speciesCode: Number(r.confidence?.speciesCode ?? 0.94),
        dbhCm: Number(r.confidence?.dbhCm ?? 0.92),
        heightM: Number(r.confidence?.heightM ?? 0.90)
      },
      flags: {
        dbhUncertain: Boolean(r.flags?.dbhUncertain),
        heightUncertain: Boolean(r.flags?.heightUncertain)
      },
      comments: Array.isArray(r.comments) ? r.comments.map((c: any, cIdx: number) => ({
        id: `c_${Date.now()}_${idx}_${cIdx}`,
        author: 'Gemini Vision AI',
        text: typeof c === 'string' ? c : (c.text || 'Audited field'),
        timestamp: Date.now(),
        isResolved: false
      })) : [],
      isVerified: !r.flags?.dbhUncertain && !r.flags?.heightUncertain
    };
  }) : [];

  const metadataFields: DocumentMetadataItem[] = Array.isArray(parsed.metadataFields) 
    ? parsed.metadataFields 
    : [];

  return {
    documentType: docType,
    title: parsed.title || `Document: ${fileName.replace(/\.[^/.]+$/, "")}`,
    institution: parsed.institution || 'Document Record',
    subHeader: parsed.subHeader || '',
    personName: parsed.personName || '',
    idNumber: parsed.idNumber || '',
    plotCode: parsed.plotCode || parsed.idNumber || `REF-${Date.now().toString().slice(-4)}`,
    forestStation: parsed.forestStation || parsed.institution || 'Archive',
    observerName: parsed.observerName || parsed.personName || 'Scanner Operator',
    date: Date.now(),
    summary: parsed.summary || 'Document digitized successfully with Gemini Vision AI.',
    metadataFields,
    tableHeaders,
    rows: rows,
    isAiExtracted: true,
    modelUsed: 'gemini-vision'
  };
}

function defaultHeadersForType(type: string): DocumentHeaderColumn[] {
  return [
    { key: 'col_1', label: 'Item #' },
    { key: 'col_2', label: 'Field / Description' },
    { key: 'col_3', label: 'Value 1' },
    { key: 'col_4', label: 'Value 2' },
    { key: 'col_5', label: 'Status' },
    { key: 'col_6', label: 'Notes' }
  ];
}

/**
 * Intelligent Document Recognizer for offline / preview before live Gemini OCR
 */
export function recognizeDocumentLocal(imageDataUrl: string, fileName: string): GeminiExtractionResult {
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

  return {
    documentType: 'general_document',
    title: `${capitalized}`,
    institution: 'Document Image Capture',
    subHeader: `File: ${fileName}`,
    personName: '',
    idNumber: `DOC-${Date.now().toString().slice(-4)}`,
    plotCode: `DOC-${Date.now().toString().slice(-4)}`,
    forestStation: 'Archive',
    observerName: 'User',
    date: Date.now(),
    summary: `Document image (${fileName}) loaded. Connect your Gemini API key to run live OCR handwriting transcription.`,
    metadataFields: [
      { label: 'File Name', value: fileName },
      { label: 'Uploaded Date', value: new Date().toLocaleDateString() },
      { label: 'OCR Status', value: 'API Key Required for Live Transcription' }
    ],
    tableHeaders: [
      { key: 'col_num', label: 'Item #' },
      { key: 'col_desc', label: 'Field / Section' },
      { key: 'col_val', label: 'Extracted Value' },
      { key: 'col_conf', label: 'Probability' },
      { key: 'col_notes', label: 'Status' }
    ],
    rows: [
      {
        rowNumber: 1,
        treeNumber: "01",
        speciesCode: "Image Upload",
        dbhCm: "100%",
        heightM: "High",
        healthStatus: "Ready",
        notes: fileName,
        cells: {
          col_num: "01",
          col_desc: "Original Image",
          col_val: fileName,
          col_conf: "100%",
          col_notes: "Loaded and stored in local database"
        },
        candidateValues: {},
        confidence: { treeNumber: 0.99, speciesCode: 0.99, dbhCm: 0.99, heightM: 0.99 },
        flags: { dbhUncertain: false, heightUncertain: false },
        comments: [],
        isVerified: true
      },
      {
        rowNumber: 2,
        treeNumber: "02",
        speciesCode: "Handwriting OCR",
        dbhCm: "Pending",
        heightM: "Pending",
        healthStatus: "Awaiting Key",
        notes: "Enter free Gemini API key to transcribe text and tables",
        cells: {
          col_num: "02",
          col_desc: "AI Handwriting OCR",
          col_val: "Gemini Key Needed",
          col_conf: "50%",
          col_notes: "Enter Gemini API key to transcribe actual text"
        },
        candidateValues: {
          col_val: [
            { value: "Gemini Key Needed", probability: 0.50, reason: "Awaiting API key to parse image" }
          ]
        },
        confidence: { treeNumber: 0.90, speciesCode: 0.85, dbhCm: 0.50, heightM: 0.50 },
        flags: { dbhUncertain: true, heightUncertain: false },
        comments: [
          {
            id: `c_${Date.now()}`,
            author: "System",
            text: "Connect your free Gemini API key using the key icon in the top header to run real AI OCR on this image.",
            timestamp: Date.now(),
            isResolved: false
          }
        ],
        isVerified: false
      }
    ],
    isAiExtracted: false,
    modelUsed: 'offline-preview'
  };
}

export function generateLocalScan(imageDataUrl: string, fileName: string): GeminiExtractionResult {
  return recognizeDocumentLocal(imageDataUrl, fileName);
}
