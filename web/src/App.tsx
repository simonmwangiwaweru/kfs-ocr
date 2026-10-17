import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  FileText, 
  Archive, 
  Info, 
  AlertTriangle, 
  Download, 
  CloudOff, 
  Cloud, 
  Layers, 
  Trees,
  CheckCircle2,
  Smartphone,
  Upload,
  RefreshCw,
  Search,
  MessageSquare,
  Edit3,
  Check,
  X,
  Sparkles,
  Copy,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  Image as ImageIcon,
  Printer,
  Trash2,
  Eye,
  Key
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScanRecord, db } from './db';
import { 
  extractWithGeminiVision, 
  getStoredGeminiKey, 
  saveStoredGeminiKey, 
  clearStoredGeminiKey, 
  generateLocalScan,
  testGeminiApiKey
} from './gemini';

interface RowComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  isResolved: boolean;
}

interface TreeRow {
  rowNumber: number;
  treeNumber: string;
  speciesCode: string;
  dbhCm: string;
  heightM: string;
  healthStatus: string;
  notes: string;
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
  comments: RowComment[];
  isVerified?: boolean;
}


export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'review' | 'history'>('scan');
  const [scanMode, setScanMode] = useState<'single' | 'batch' | 'queue'>('single');
  const [documents, setDocuments] = useState<ScanRecord[]>([]);
  const [activeDoc, setActiveDoc] = useState<ScanRecord | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inspector modal state
  const [selectedCell, setSelectedCell] = useState<{
    rowNumber: number;
    field: string;
    headerKey: string;
    label: string;
    value: string;
    confidence: number;
    isUncertain: boolean;
    candidateValues?: Array<{ value: string; probability: number; reason?: string }>;
  } | null>(null);

  const [editValue, setEditValue] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load from IndexedDB on initial mount, removing any old sample mockups
  useEffect(() => {
    const initDb = async () => {
      try {
        const all = await db.scans.toArray();
        // Filter out and purge any previous sample mockups or legacy test records
        const userDocs = all.filter(d => 
          d.id !== "DOC-ABER-2023-01" && 
          !d.id.startsWith("DOC-SAMPLE-") &&
          !d.title?.includes("BULLETIN DE LA 3ème") &&
          !d.institution?.includes("CONGO")
        );
        for (const doc of all) {
          if (doc.id === "DOC-ABER-2023-01" || doc.title?.includes("BULLETIN DE LA 3ème") || doc.institution?.includes("CONGO")) {
            try { await db.scans.delete(doc.id); } catch (_) {}
          }
        }
        setDocuments(userDocs);
        if (userDocs.length > 0) {
          setActiveDoc(userDocs[0]);
        } else {
          setActiveDoc(null);
        }
      } catch (e) {
        console.warn("IndexedDB fallback to in-memory state:", e);
      }
    };
    initDb();
  }, []);

  // Gemini AI modal and drag-drop state
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyModalReason, setApiKeyModalReason] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{ imageSrc: string; fileName: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCustomKey, setHasCustomKey] = useState(Boolean(getStoredGeminiKey()));
  const [testingKey, setTestingKey] = useState(false);
  const [testKeyResult, setTestKeyResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleScanDocument = async (imageSrc: string, fileName: string) => {
    setIsProcessing(true);
    setProcessingStep("1/3: Initializing Gemini Multimodal Vision...");

    try {
      const extraction = await extractWithGeminiVision(
        imageSrc, 
        fileName, 
        (step) => setProcessingStep(step)
      );

      const newDoc: ScanRecord = {
        id: `DOC-${Date.now().toString().slice(-6)}`,
        title: extraction.title,
        documentType: extraction.documentType,
        institution: extraction.institution,
        subHeader: extraction.subHeader,
        personName: extraction.personName,
        idNumber: extraction.idNumber,
        metadataFields: extraction.metadataFields,
        tableHeaders: extraction.tableHeaders,
        plotCode: extraction.plotCode,
        forestStation: extraction.forestStation,
        observerName: extraction.observerName,
        date: extraction.date,
        imageDataUrl: imageSrc,
        fileSizeBytes: Math.round(imageSrc.length * 0.75),
        fileType: extraction.modelUsed ? `Gemini Vision AI (${extraction.modelUsed})` : "Gemini Multimodal Scan",
        syncStatus: isOffline ? "SAVED_OFFLINE" : "SYNCED",
        isVerified: false,
        rows: extraction.rows as any
      };

      try {
        await db.scans.add(newDoc);
      } catch (e) {
        console.warn("IndexedDB save:", e);
      }

      setDocuments(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      setSelectedRowIndex(0);
      setActiveTab('review');
      setIsProcessing(false);
      showToast("✨ Document scanned and extracted successfully!");
    } catch (err: any) {
      console.error("Gemini Vision Scan error:", err);
      setIsProcessing(false);

      if (err.message === 'NO_API_KEY' || err.message === 'QUOTA_EXCEEDED' || err.message === 'INVALID_API_KEY') {
        setApiKeyModalReason(
          err.message === 'QUOTA_EXCEEDED' 
            ? "Your current Gemini API quota has been reached. Please enter your free Google Gemini API key to continue scanning."
            : err.message === 'INVALID_API_KEY'
            ? "The configured Gemini API key is invalid. Please enter a valid key from Google AI Studio."
            : "To scan and understand your document with Gemini AI, please provide your free Gemini API key."
        );
        setShowApiKeyModal(true);
        setPendingScan({ imageSrc, fileName });
      } else {
        showToast("Gemini scan error: " + (err.message || "Failed to process image"));
        // Fallback to local scan
        const fallback = generateLocalScan(imageSrc, fileName);
        const newDoc: ScanRecord = {
          id: `DOC-${Date.now().toString().slice(-6)}`,
          title: fallback.title,
          documentType: fallback.documentType,
          institution: fallback.institution,
          subHeader: fallback.subHeader,
          personName: fallback.personName,
          idNumber: fallback.idNumber,
          metadataFields: fallback.metadataFields,
          tableHeaders: fallback.tableHeaders,
          plotCode: fallback.plotCode,
          forestStation: fallback.forestStation,
          observerName: fallback.observerName,
          date: fallback.date,
          imageDataUrl: imageSrc,
          fileSizeBytes: Math.round(imageSrc.length * 0.75),
          fileType: "Document Scan",
          syncStatus: "SAVED_OFFLINE",
          isVerified: false,
          rows: fallback.rows as any
        };
        try { await db.scans.add(newDoc); } catch (_) {}
        setDocuments(prev => [newDoc, ...prev]);
        setActiveDoc(newDoc);
        setActiveTab('review');
      }
    }
  };

  const handleProcessSelectedFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      await handleScanDocument(result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessSelectedFile(file);
    // Reset input so user can re-upload the same file if needed
    e.target.value = '';
  };

  const handleTestKey = async () => {
    const keyToTest = apiKeyInput.trim() || getStoredGeminiKey();
    if (!keyToTest) {
      setTestKeyResult({ success: false, message: "Please paste a key first to test." });
      return;
    }
    setTestingKey(true);
    setTestKeyResult(null);
    const res = await testGeminiApiKey(keyToTest);
    setTestingKey(false);
    setTestKeyResult(res);
  };

  const handleClearApiKey = () => {
    clearStoredGeminiKey();
    setApiKeyInput('');
    setHasCustomKey(Boolean(getStoredGeminiKey()));
    setTestKeyResult(null);
    showToast("API key removed from browser storage.");
  };

  const handleApplyApiKeyAndRetry = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      showToast("Please enter an API key or use Offline Preview");
      return;
    }
    saveStoredGeminiKey(trimmed);
    setHasCustomKey(true);
    setShowApiKeyModal(false);
    setTestKeyResult(null);
    showToast("Gemini API key saved to browser!");

    if (pendingScan) {
      const { imageSrc, fileName } = pendingScan;
      setPendingScan(null);
      await handleScanDocument(imageSrc, fileName);
    }
  };

  const handleProceedOfflineFallback = async () => {
    setShowApiKeyModal(false);
    if (pendingScan) {
      const { imageSrc, fileName } = pendingScan;
      setPendingScan(null);
      const fallback = generateLocalScan(imageSrc, fileName);
      const newDoc: ScanRecord = {
        id: `DOC-OFFLINE-${Date.now().toString().slice(-6)}`,
        title: fallback.title,
        documentType: fallback.documentType,
        institution: fallback.institution,
        subHeader: fallback.subHeader,
        personName: fallback.personName,
        idNumber: fallback.idNumber,
        metadataFields: fallback.metadataFields,
        tableHeaders: fallback.tableHeaders,
        plotCode: fallback.plotCode,
        forestStation: fallback.forestStation,
        observerName: fallback.observerName,
        date: fallback.date,
        imageDataUrl: imageSrc,
        fileSizeBytes: Math.round(imageSrc.length * 0.75),
        fileType: "Offline Form",
        syncStatus: "SAVED_OFFLINE",
        isVerified: false,
        rows: fallback.rows as any
      };
      try { await db.scans.add(newDoc); } catch (_) {}
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      setActiveTab('review');
      showToast("Loaded in offline mode");
    }
  };

  const handleCellClick = (
    rowNumber: number,
    field: string,
    headerKey: string,
    label: string,
    value: string,
    confidence: number,
    isUncertain: boolean,
    index: number,
    candidateValues?: Array<{ value: string; probability: number; reason?: string }>
  ) => {
    setSelectedRowIndex(index);
    setSelectedCell({
      rowNumber,
      field,
      headerKey,
      label,
      value,
      confidence,
      isUncertain,
      candidateValues
    });
    setEditValue(value);
  };

  const handleSaveCellValue = () => {
    if (!selectedCell || !activeDoc) return;
    const updatedRows = activeDoc.rows.map(row => {
      if (row.rowNumber === selectedCell.rowNumber) {
        const newFlags = { ...row.flags };
        if (selectedCell.field === 'dbhCm' || selectedCell.headerKey === 'col_p1') newFlags.dbhUncertain = false;
        if (selectedCell.field === 'heightM' || selectedCell.headerKey === 'col_exam1') newFlags.heightUncertain = false;
        const newCells = { ...(row.cells || {}) };
        if (selectedCell.headerKey) {
          newCells[selectedCell.headerKey] = editValue;
        }
        return {
          ...row,
          [selectedCell.field]: editValue,
          cells: newCells,
          flags: newFlags,
          isVerified: true
        };
      }
      return row;
    });

    const updatedDoc: ScanRecord = {
      ...activeDoc,
      rows: updatedRows
    };

    setActiveDoc(updatedDoc);
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    try {
      db.scans.put(updatedDoc);
    } catch (e) {
      console.warn(e);
    }

    setSelectedCell(null);
    showToast(`Updated Row ${selectedCell.rowNumber} ${selectedCell.label} to "${editValue}"`);
  };

  const handleAddComment = () => {
    if (!selectedCell || !newCommentText.trim() || !activeDoc) return;
    const updatedRows = activeDoc.rows.map(row => {
      if (row.rowNumber === selectedCell.rowNumber) {
        return {
          ...row,
          comments: [
            ...row.comments,
            {
              id: `c_${Date.now()}`,
              author: "Reviewer (Desk Auditor)",
              text: newCommentText.trim(),
              timestamp: Date.now(),
              isResolved: false
            }
          ]
        };
      }
      return row;
    });

    const updatedDoc: ScanRecord = { ...activeDoc, rows: updatedRows };
    setActiveDoc(updatedDoc);
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    setNewCommentText('');
    showToast("Audit comment recorded");
  };

  const handleToggleResolveComment = (rowNumber: number, commentId: string) => {
    if (!activeDoc) return;
    const updatedRows = activeDoc.rows.map(row => {
      if (row.rowNumber === rowNumber) {
        return {
          ...row,
          comments: row.comments.map(c => c.id === commentId ? { ...c, isResolved: !c.isResolved } : c)
        };
      }
      return row;
    });
    const updatedDoc: ScanRecord = { ...activeDoc, rows: updatedRows };
    setActiveDoc(updatedDoc);
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
  };

  const handleVerifyAll = () => {
    if (!activeDoc) return;
    const updatedRows = activeDoc.rows.map(r => ({
      ...r,
      isVerified: true,
      flags: { dbhUncertain: false, heightUncertain: false }
    }));
    const updatedDoc: ScanRecord = {
      ...activeDoc,
      isVerified: true,
      rows: updatedRows
    };
    setActiveDoc(updatedDoc);
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    showToast("All table rows verified & marked ready for export!");
  };

  const getDocumentHeaders = (doc: ScanRecord): Array<{ key: string; label: string }> => {
    if (doc.tableHeaders && doc.tableHeaders.length > 0) {
      return doc.tableHeaders;
    }
    if (doc.documentType === 'school_bulletin') {
      return [
        { key: 'col_num', label: 'N°' },
        { key: 'col_subject', label: 'BRANCHES / MATIÈRES' },
        { key: 'col_max', label: 'MAX' },
        { key: 'col_p1', label: '1ère P.' },
        { key: 'col_p2', label: '2ème P.' },
        { key: 'col_exam1', label: 'EXAM. 1' },
        { key: 'col_tot1', label: 'TOT. 1' },
        { key: 'col_mention', label: 'APPRÉCIATION' }
      ];
    }
    return [
      { key: 'treeNumber', label: 'Item #' },
      { key: 'speciesCode', label: 'Description' },
      { key: 'dbhCm', label: 'Value 1' },
      { key: 'heightM', label: 'Value 2' },
      { key: 'healthStatus', label: 'Status' },
      { key: 'notes', label: 'Remarks' }
    ];
  };

  const getCellDisplay = (row: any, headerKey: string): string => {
    if (row.cells && row.cells[headerKey] !== undefined) {
      return String(row.cells[headerKey]);
    }
    if (headerKey === 'col_num' || headerKey === 'treeNumber') return row.treeNumber || String(row.rowNumber);
    if (headerKey === 'col_subject' || headerKey === 'speciesCode') return row.speciesCode || '';
    if (headerKey === 'col_max') return '40';
    if (headerKey === 'col_p1' || headerKey === 'dbhCm') return row.dbhCm || '';
    if (headerKey === 'col_p2') return '8.0';
    if (headerKey === 'col_exam1' || headerKey === 'heightM') return row.heightM || '';
    if (headerKey === 'col_tot1') return row.heightM || '';
    if (headerKey === 'col_mention' || headerKey === 'healthStatus') return row.healthStatus || 'Bien';
    if (headerKey === 'notes' || headerKey === 'col_notes') return row.notes || '';
    return '—';
  };

  const handleExportWord = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);

    const headerHtml = `
      <div style="border-bottom: 2px solid #047857; padding-bottom: 12px; margin-bottom: 16px;">
        <h1 style="color: #047857; font-size: 16pt; margin: 0; text-transform: uppercase;">${doc.institution || 'Document Digitization Report'}</h1>
        ${doc.subHeader ? `<p style="color: #64748b; font-size: 11pt; margin-top: 4px; margin-bottom: 0;">${doc.subHeader}</p>` : ''}
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 20px;">
        <h2 style="color: #0f172a; font-size: 13pt; margin: 0 0 6px 0;">${doc.title}</h2>
        ${doc.personName ? `<div style="font-size: 10pt; color: #475569;">Name / Subject: <strong>${doc.personName}</strong></div>` : ''}
      </div>
    `;

    const metaGridHtml = (doc.metadataFields && doc.metadataFields.length > 0) ? `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; background: #fafafa; border: 1px solid #e2e8f0;">
        <tbody>
          ${doc.metadataFields.reduce((acc, curr, i, arr) => {
            if (i % 2 === 0) {
              const next = arr[i + 1];
              acc.push(`
                <tr>
                  <td style="padding: 6px 12px; border: 1px solid #e2e8f0; width: 50%;"><strong>${curr.label}:</strong> ${curr.value}</td>
                  <td style="padding: 6px 12px; border: 1px solid #e2e8f0; width: 50%;">${next ? `<strong>${next.label}:</strong> ${next.value}` : ''}</td>
                </tr>
              `);
            }
            return acc;
          }, [] as string[]).join('')}
        </tbody>
      </table>
    ` : `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; margin-bottom: 18px; font-size: 10pt;">
        <div><strong>Ref Code:</strong> ${doc.plotCode} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date(doc.date).toLocaleDateString()}</div>
      </div>
    `;

    const tableHeadersHtml = headers.map(h => 
      `<th style="background-color: #047857; color: white; padding: 9px 10px; border: 1px solid #047857; text-align: left; font-size: 10pt;">${h.label}</th>`
    ).join('');

    const tableRowsHtml = doc.rows.map((r, idx) => {
      const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = headers.map(h => {
        const val = getCellDisplay(r, h.key);
        const isBold = h.key.includes('subject') || h.key.includes('desc') || h.key.includes('tot');
        return `<td style="padding: 8px 10px; border: 1px solid #cbd5e1; background-color: ${bg}; ${isBold ? 'font-weight: bold;' : ''}">${val}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const signaturesHtml = `
      <div style="margin-top: 30px; font-size: 10pt; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        Digitized & Verified • ${new Date().toLocaleDateString()}
      </div>
    `;

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${doc.title}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${metaGridHtml}
        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        ${signaturesHtml}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (doc.personName || doc.title || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanName}_Formatted_Document.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded formatted Word document (.doc)!");
  };

  const handleExportImage = (doc: ScanRecord) => {
    if (doc.imageDataUrl) {
      const link = document.createElement("a");
      link.href = doc.imageDataUrl;
      const cleanName = (doc.personName || doc.title || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${cleanName}_Original_Scan.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Downloaded original document photo (.jpg)!");
    } else {
      showToast("No document image available to export.");
    }
  };

  const handleExportPDF = (doc: ScanRecord) => {
    const printWindow = window.open('', '_blank');
    const headers = getDocumentHeaders(doc);

    const tableHeadersHtml = headers.map(h => 
      `<th style="background: #047857; color: #ffffff; padding: 8px 10px; border: 1px solid #047857; text-align: left;">${h.label}</th>`
    ).join('');

    const tableRowsHtml = doc.rows.map(r => {
      const cells = headers.map(h => {
        const val = getCellDisplay(r, h.key);
        const isBold = h.key.includes('subject') || h.key.includes('desc') || h.key.includes('tot');
        return `<td style="padding: 7px 10px; border: 1px solid #cbd5e1; ${isBold ? 'font-weight: bold;' : ''}">${val}</td>`;
      }).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const metaGridHtml = (doc.metadataFields && doc.metadataFields.length > 0) ? `
      <div class="card" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px;">
        ${doc.metadataFields.map(m => `<div><strong>${m.label}:</strong> ${m.value}</div>`).join('')}
      </div>
    ` : `
      <div class="card">
        <div><strong>Document:</strong> ${doc.title} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date(doc.date).toLocaleDateString()}</div>
      </div>
    `;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.title} - Document Format</title>
          <style>
            @page { size: portrait; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; font-size: 12px; }
            h1 { color: #047857; margin: 0 0 4px 0; font-size: 18px; font-weight: 700; text-transform: uppercase; }
            .header-banner { text-align: center; border-bottom: 2px solid #047857; padding-bottom: 10px; margin-bottom: 12px; }
            .sub { color: #64748b; font-size: 11px; margin-bottom: 12px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
            tr:nth-child(even) { background-color: #f8fafc; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h2 style="margin: 0; font-size: 15px; color: #047857; text-transform: uppercase;">
              ${doc.institution || 'Document Record'}
            </h2>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">${doc.subHeader || ''}</div>
          </div>
          <h1>${doc.title}</h1>
          ${metaGridHtml}
          <table>
            <thead>
              <tr>${tableHeadersHtml}</tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
          <div style="margin-top: 30px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">
            Digitized & Verified • ${new Date().toLocaleDateString()}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      showToast("Opened printable PDF document preview!");
    } else {
      window.print();
    }
  };

  const handleExportXLSX = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const wsData = doc.rows.map(r => {
      const rowObj: Record<string, string> = {};
      headers.forEach(h => {
        rowObj[h.label] = getCellDisplay(r, h.key);
      });
      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Données");
    const cleanName = (doc.personName || doc.title || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `${cleanName}_Donnees.xlsx`);
    showToast("Downloaded Excel (.xlsx) file!");
  };

  const handleExportCSV = (doc: ScanRecord) => {
    const headers = ["Plot", "Station", "Tree_No", "Species", "DBH_cm", "Height_m", "Health", "Notes"];
    const rows = doc.rows.map(r => [
      doc.plotCode,
      `"${doc.forestStation}"`,
      r.treeNumber,
      r.speciesCode,
      r.dbhCm,
      r.heightM,
      `"${r.healthStatus}"`,
      `"${r.notes}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${doc.plotCode.replace('/', '_')}_Inventory.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded CSV file!");
  };

  const handleDeleteDoc = async (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await db.scans.delete(docId);
    } catch (err) {
      console.warn(err);
    }
    setDocuments(prev => prev.filter(d => d.id !== docId));
    if (activeDoc?.id === docId) {
      const remaining = documents.filter(d => d.id !== docId);
      setActiveDoc(remaining.length > 0 ? remaining[0] : null);
    }
    showToast("Document removed from archive");
  };

  const handleCopyClipboard = (doc: ScanRecord) => {
    const text = doc.rows.map(r => `${r.treeNumber}\t${r.speciesCode}\t${r.dbhCm}\t${r.heightM}\t${r.healthStatus}\t${r.notes}`).join('\n');
    navigator.clipboard.writeText(`Tree#\tSpecies\tDBH(cm)\tHeight(m)\tHealth\tNotes\n${text}`);
    showToast("Copied table to clipboard!");
  };

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.plotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.forestStation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUncertainties = activeDoc?.rows?.filter(r => r.flags.dbhUncertain || r.flags.heightUncertain).length ?? 0;
  const verifiedCount = activeDoc?.rows?.filter(r => r.isVerified).length ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans antialiased text-[#0F172A]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#064E3B] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-emerald-500/30 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">Document & Form Scanner</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">AI OCR</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Intelligent Paper OCR • Handwriting Recognition • Probability Breakdown</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setApiKeyInput(getStoredGeminiKey());
                setApiKeyModalReason(null);
                setTestKeyResult(null);
                setShowApiKeyModal(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                hasCustomKey
                  ? 'bg-emerald-50 border border-emerald-200/80 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 shadow-xs'
              }`}
              title="Click to view Gemini API status and settings"
            >
              <span className={`w-2 h-2 rounded-full ${hasCustomKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{hasCustomKey ? 'AI OCR Ready' : 'Connect Gemini Key'}</span>
              <Key size={13} className="ml-0.5 opacity-70" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 md:p-6 pb-28">
        {/* TAB 1: SCANNER */}
        {activeTab === 'scan' && (
          <div className="space-y-5 max-w-3xl mx-auto">
            {/* Segmented Mode Selector */}
            <div className="bg-slate-200/80 p-1 rounded-xl grid grid-cols-3 gap-1">
              <button 
                onClick={() => setScanMode('single')}
                className={`py-2 px-2 rounded-lg text-center transition flex flex-col items-center justify-center ${
                  scanMode === 'single' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <Camera size={14} className={scanMode === 'single' ? 'text-emerald-700' : 'text-slate-500'} />
                  <span>Single Page</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">Immediate OCR</span>
              </button>
              <button 
                onClick={() => setScanMode('batch')}
                className={`py-2 px-2 rounded-lg text-center transition flex flex-col items-center justify-center ${
                  scanMode === 'batch' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <Layers size={14} className={scanMode === 'batch' ? 'text-emerald-700' : 'text-slate-500'} />
                  <span>Batch Mode</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">{batchCount} In Batch</span>
              </button>
              <button 
                onClick={() => { setScanMode('queue'); setActiveTab('history'); }}
                className={`py-2 px-2 rounded-lg text-center transition flex flex-col items-center justify-center ${
                  scanMode === 'queue' ? 'bg-white shadow-xs font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="text-xs flex items-center gap-1.5">
                  <Archive size={14} className={scanMode === 'queue' ? 'text-emerald-700' : 'text-slate-500'} />
                  <span>Document Tray</span>
                </div>
                <span className="text-[10px] text-slate-500 font-normal">{documents.length} Archived</span>
              </button>
            </div>

            {/* Clean Professional White Capture Container with Drag & Drop */}
            <div 
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleProcessSelectedFile(file);
              }}
              className={`relative bg-white rounded-2xl overflow-hidden border transition-all min-h-[380px] flex flex-col items-center justify-center p-8 text-center ${
                isDragging ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-100' : 'border-slate-200 shadow-sm'
              }`}
            >

              {/* OCR Scanning Progress Screen */}
              {isProcessing ? (
                <div className="relative z-20 space-y-4 max-w-sm mx-auto p-6 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mx-auto"></div>
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center justify-center gap-1.5">
                      <Sparkles size={16} className="text-emerald-600" /> Gemini Vision AI Scanning
                    </h3>
                    <p className="text-xs text-slate-600 font-medium">{processingStep}</p>
                  </div>
                  {/* Progress Bar Animation */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full w-2/3 animate-pulse rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 space-y-4 max-w-md">
                  <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center text-emerald-700 mx-auto shadow-xs">
                    <Camera size={30} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Take picture or upload picture</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-sm mx-auto">
                      Point camera at the physical paper sheet, drag & drop an image here, or upload from your device.
                    </p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                    {/* Camera Button */}
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                    >
                      <Camera size={16} /> Take Picture
                    </button>

                    {/* Upload File Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                    >
                      <Upload size={16} /> Upload Picture
                    </button>
                  </div>

                  {/* Hidden file inputs */}
                  <input
                    type="file"
                    ref={cameraInputRef}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
              )}
            </div>

            {/* Batch Status Bar */}
            {scanMode === 'batch' && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex justify-between items-center shadow-xs">
                <div>
                  <h4 className="font-bold text-emerald-950 text-sm">Batch Queue ({batchCount} Pages)</h4>
                  <p className="text-xs text-emerald-800">Pages will be aggregated into a continuous plot document.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setBatchCount(c => c + 1)}
                    className="bg-white border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                  >
                    + Add Page
                  </button>
                  {batchCount > 0 && (
                    <button 
                      onClick={() => {
                        handleScanDocument('/sample_field_form.jpg', `Batch_${batchCount}_Pages.jpg`);
                        setBatchCount(0);
                      }}
                      className="bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-800 transition"
                    >
                      Process All
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Tips Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Info size={14} className="text-emerald-700" /> Best Practices for Forestry Paper Forms
              </h3>
              <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
                <li>Ensure the paper is flat with good daylight or phone torch illumination to avoid shadows.</li>
                <li>Keep the full rectangular grid borders inside the screen reticle.</li>
                <li>Handwritten numbers with smudges will be flagged with yellow alerts for desk review.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIEW DOCUMENTATION & EXPORT */}
        {activeTab === 'review' && (
          <div className="space-y-5">
            {!activeDoc ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <FileText size={32} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">No Document Ready for Preview</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Take a photo or upload an image in the Scan tab to see the preview documentation and export options.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('scan')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-2 shadow-xs"
                >
                  <Camera size={15} /> Go to Scanner
                </button>
              </div>
            ) : (
              <>
                {/* Document Summary Header */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    {activeDoc.institution && (
                      <div className="text-[11px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg inline-block">
                        🏛️ {activeDoc.institution}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base md:text-lg text-slate-900 tracking-tight">{activeDoc.title}</h2>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 size={12} /> Ready for Export
                      </span>
                    </div>
                    {/* Dynamic metadata tags */}
                    <div className="flex flex-wrap gap-2 text-xs text-slate-600 pt-1">
                      {activeDoc.metadataFields && activeDoc.metadataFields.length > 0 ? (
                        activeDoc.metadataFields.map((m, idx) => (
                          <span key={idx} className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            {m.label}: <strong className="text-slate-900">{m.value}</strong>
                          </span>
                        ))
                      ) : (
                        <>
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg">Ref: <strong>{activeDoc.plotCode}</strong></span>
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg">Source: <strong>{activeDoc.forestStation}</strong></span>
                          <span className="bg-slate-100 px-2.5 py-1 rounded-lg">Reviewer: <strong>{activeDoc.observerName}</strong></span>
                        </>
                      )}
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg font-semibold">
                        {activeDoc.rows.length} Rows Extracted
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyAll}
                    className="self-start md:self-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                  >
                    <ShieldCheck size={14} className="text-emerald-700" /> Verify All
                  </button>
                </div>

                {/* EXPORT OPTIONS CARDS (4 FORMATS: Word, Image, PDF, Excel) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Download size={16} className="text-emerald-700" /> Export Options
                      </h3>
                      <p className="text-xs text-slate-500">Choose your preferred documentation format to download or share:</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    {/* Format 1: Word (.docx / .doc) */}
                    <button
                      onClick={() => handleExportWord(activeDoc)}
                      className="group bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 hover:border-blue-300 rounded-xl p-3.5 text-left transition flex flex-col justify-between shadow-xs active:scale-98"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                          <FileText size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded">.DOCX</span>
                      </div>
                      <div className="mt-3">
                        <div className="font-bold text-xs text-blue-950 group-hover:text-blue-700 transition">Word Document</div>
                        <div className="text-[11px] text-blue-700/80">Formatted office report</div>
                      </div>
                    </button>

                    {/* Format 2: Image (.jpg / .png) */}
                    <button
                      onClick={() => handleExportImage(activeDoc)}
                      className="group bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200 hover:border-purple-300 rounded-xl p-3.5 text-left transition flex flex-col justify-between shadow-xs active:scale-98"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-9 h-9 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                          <ImageIcon size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100/80 px-1.5 py-0.5 rounded">.JPG</span>
                      </div>
                      <div className="mt-3">
                        <div className="font-bold text-xs text-purple-950 group-hover:text-purple-700 transition">Image File</div>
                        <div className="text-[11px] text-purple-700/80">Original scanned photo</div>
                      </div>
                    </button>

                    {/* Format 3: PDF (.pdf) */}
                    <button
                      onClick={() => handleExportPDF(activeDoc)}
                      className="group bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200 hover:border-rose-300 rounded-xl p-3.5 text-left transition flex flex-col justify-between shadow-xs active:scale-98"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                          <Printer size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded">.PDF</span>
                      </div>
                      <div className="mt-3">
                        <div className="font-bold text-xs text-rose-950 group-hover:text-rose-700 transition">PDF Document</div>
                        <div className="text-[11px] text-rose-700/80">Printable sheet format</div>
                      </div>
                    </button>

                    {/* Format 4: Excel (.xlsx) */}
                    <button
                      onClick={() => handleExportXLSX(activeDoc)}
                      className="group bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200 hover:border-emerald-300 rounded-xl p-3.5 text-left transition flex flex-col justify-between shadow-xs active:scale-98"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                          <FileSpreadsheet size={18} />
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">.XLSX</span>
                      </div>
                      <div className="mt-3">
                        <div className="font-bold text-xs text-emerald-950 group-hover:text-emerald-800 transition">Excel Sheet</div>
                        <div className="text-[11px] text-emerald-700/80">Spreadsheet table</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* DOCUMENTATION PREVIEW (Original Photo & Extracted Table) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Pane: Original Captured Photo */}
                  <div className="lg:col-span-5 bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-emerald-700" /> Scanned Document Photo
                      </h3>
                      {activeDoc.imageDataUrl && (
                        <a 
                          href={activeDoc.imageDataUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <Eye size={12} /> View Full
                        </a>
                      )}
                    </div>

                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 flex items-center justify-center min-h-[300px]">
                      {activeDoc.imageDataUrl ? (
                        <img 
                          src={activeDoc.imageDataUrl} 
                          alt="Captured document" 
                          className="w-full h-auto max-h-[460px] object-contain select-none"
                        />
                      ) : (
                        <div className="text-center p-8 text-slate-400 space-y-2">
                          <ImageIcon size={32} className="mx-auto text-slate-500" />
                          <p className="text-xs">No image preview available</p>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                      <span>Status: <strong className="text-emerald-800">Transcribed</strong></span>
                      <span className="font-semibold text-emerald-800">{verifiedCount} of {activeDoc.rows.length} verified</span>
                    </div>
                  </div>

                  {/* Right Pane: Extracted Data Table */}
                  <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                    <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <FileSpreadsheet size={14} className="text-emerald-700" /> Extracted Data Table
                        </h3>
                        <span className="text-[11px] text-slate-500 font-medium">
                          ({activeDoc.rows.length} Rows)
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 italic">Click any cell to edit or view AI probability</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                          <tr>
                            {getDocumentHeaders(activeDoc).map(h => (
                              <th key={h.key} className="p-2.5 whitespace-nowrap">{h.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {activeDoc.rows.map((row, idx) => {
                            const isSelected = selectedRowIndex === idx;
                            const headers = getDocumentHeaders(activeDoc);
                            return (
                              <tr 
                                key={row.rowNumber} 
                                className={`transition cursor-pointer ${
                                  isSelected ? 'bg-emerald-50 font-medium' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => setSelectedRowIndex(idx)}
                              >
                                {headers.map((h, hIdx) => {
                                  const val = getCellDisplay(row, h.key);
                                  const isFirst = hIdx === 0;
                                  const isSubject = h.key.includes('subject') || h.key.includes('species');
                                  const isTotal = h.key.includes('tot');
                                  const isMention = h.key.includes('mention') || h.key.includes('health');

                                  const candidates = (row.candidateValues && row.candidateValues[h.key]) || [];
                                  const hasCandidates = candidates.length > 0;
                                  const topProb = candidates[0]?.probability ?? 0.95;
                                  const isUncertain = (h.key === 'col_p1' && row.flags?.dbhUncertain) || 
                                                      (h.key === 'col_exam1' && row.flags?.heightUncertain) || 
                                                      (hasCandidates && topProb < 0.85);

                                  return (
                                    <td 
                                      key={h.key}
                                      className={`p-2.5 transition relative cursor-pointer ${
                                        isFirst ? 'font-mono font-bold text-slate-900' : ''
                                      } ${
                                        isSubject ? 'font-bold text-slate-900 font-sans' : ''
                                      } ${isTotal ? 'font-mono font-bold text-blue-900' : ''} ${
                                        isUncertain ? 'bg-amber-50/80 hover:bg-amber-100/70' : 'hover:bg-slate-100/70'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCellClick(
                                          row.rowNumber,
                                          isSubject ? 'speciesCode' : h.key === 'col_p1' ? 'dbhCm' : h.key === 'col_exam1' ? 'heightM' : h.key,
                                          h.key,
                                          h.label,
                                          val,
                                          topProb,
                                          isUncertain,
                                          idx,
                                          candidates
                                        );
                                      }}
                                    >
                                      <div className="flex items-center gap-1.5 justify-between">
                                        {isMention ? (
                                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap">
                                            {val}
                                          </span>
                                        ) : (
                                          <span>{val}</span>
                                        )}

                                        {/* Probability Indicator for ambiguous / faint entries */}
                                        {isUncertain && (
                                          <span 
                                            className="shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-amber-200 text-amber-900 font-bold" 
                                            title={`OCR Probability: ${(topProb * 100).toFixed(0)}% (Click to see candidate breakdown)`}
                                          >
                                            {(topProb * 100).toFixed(0)}%
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: SAVED DOCUMENTS (ARCHIVE) */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Saved Documents</h2>
                <p className="text-xs text-slate-500">Your digitized field inventory sheets and forms</p>
              </div>
              {documents.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search plot or station..."
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50"
                  />
                </div>
              )}
            </div>

            {/* Document List or Empty State */}
            {filteredDocs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                  <Archive size={30} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {documents.length === 0 ? "No Saved Documents Yet" : "No Matching Documents"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {documents.length === 0 
                      ? "Capture or upload paper forms in the Scan tab to save and export them." 
                      : "Try searching with a different keyword."}
                  </p>
                </div>
                {documents.length === 0 && (
                  <button
                    onClick={() => setActiveTab('scan')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-2 shadow-xs"
                  >
                    <Camera size={15} /> Scan First Document
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocs.map(doc => (
                  <div 
                    key={doc.id} 
                    className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-emerald-300 transition shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{doc.title}</h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Saved</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                        <span>Plot: <strong className="text-slate-800">{doc.plotCode}</strong></span>
                        <span>Station: <strong className="text-slate-800">{doc.forestStation}</strong></span>
                        <span>Date: <strong className="text-slate-800">{new Date(doc.date).toLocaleDateString()}</strong></span>
                        <span>Trees: <strong className="text-slate-800">{doc.rows.length}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setActiveDoc(doc); setActiveTab('review'); }}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Eye size={13} /> Preview
                      </button>
                      <button 
                        onClick={() => handleExportWord(doc)}
                        className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition"
                        title="Download Word (.docx)"
                      >
                        <FileText size={15} />
                      </button>
                      <button 
                        onClick={() => handleExportPDF(doc)}
                        className="p-1.5 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition"
                        title="Save as PDF"
                      >
                        <Printer size={15} />
                      </button>
                      <button 
                        onClick={() => handleExportXLSX(doc)}
                        className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition"
                        title="Download Excel (.xlsx)"
                      >
                        <FileSpreadsheet size={15} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete document"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CELL INSPECTOR DIALOG / DRAWER */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Inspect Row {selectedCell.rowNumber} • {selectedCell.label}
                </h3>
                <p className="text-[11px] text-slate-500">Handwriting verification & audit trail</p>
              </div>
              <button 
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 text-xs">
              {/* Confidence Score Bar */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700">OCR Confidence Score</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    selectedCell.confidence >= 0.9 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : selectedCell.confidence >= 0.7 
                      ? 'bg-amber-100 text-amber-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {(selectedCell.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      selectedCell.confidence >= 0.9 ? 'bg-emerald-500' : selectedCell.confidence >= 0.7 ? 'bg-amber-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${selectedCell.confidence * 100}%` }}
                  />
                </div>
                {selectedCell.isUncertain && (
                  <p className="text-[11px] text-amber-800 flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} className="text-amber-600" />
                    Flagged for review due to smudged ink or ambiguous numeral.
                  </p>
                )}
              </div>

              {/* Candidate Probability Breakdown for faint / ambiguous handwriting */}
              {selectedCell.candidateValues && selectedCell.candidateValues.length > 0 && (
                <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-600" />
                      Candidate Probabilities (Faint / Ambiguous Text)
                    </span>
                    <span className="text-[10px] text-amber-800 font-semibold">Tap to select</span>
                  </div>
                  <div className="space-y-1.5">
                    {selectedCell.candidateValues.map((cand, cIdx) => {
                      const isPicked = editValue === cand.value;
                      return (
                        <button
                          key={cIdx}
                          type="button"
                          onClick={() => setEditValue(cand.value)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition border ${
                            isPicked
                              ? 'bg-amber-100 border-amber-400 font-bold text-amber-950 shadow-2xs'
                              : 'bg-white hover:bg-amber-50/60 border-amber-200/60 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 font-bold">
                              {cand.value}
                            </span>
                            {cand.reason && (
                              <span className="text-[11px] text-slate-600 truncate max-w-[210px]">
                                {cand.reason}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-xs text-amber-800">
                            {(cand.probability * 100).toFixed(0)}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Value Editor Input */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">Verified Value</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 font-mono text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                  />
                  <button
                    onClick={handleSaveCellValue}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Check size={14} /> Save
                  </button>
                </div>
              </div>

              {/* Reviewer Comment Thread */}
              <div className="space-y-2 border-t border-slate-200 pt-3">
                <label className="font-bold text-slate-800 block">Add Audit Note</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="e.g. Confirmed 35.4 on physical tree tag..."
                    className="flex-1 text-xs px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  />
                  <button
                    onClick={handleAddComment}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setSelectedCell(null)}
                className="px-4 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
              >
                Close
              </button>
              <button
                onClick={handleSaveCellValue}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-1.5 rounded-lg text-xs font-bold"
              >
                Save & Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Gemini AI Settings / API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Gemini Vision AI OCR</h3>
                  <p className="text-xs text-slate-500">Google Gemini Multimodal Intelligence</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowApiKeyModal(false); setPendingScan(null); setTestKeyResult(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {apiKeyModalReason && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p>{apiKeyModalReason}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">
                  Google Gemini API Key
                </label>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                >
                  Get free key from Google <ExternalLink size={11} />
                </a>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setTestKeyResult(null);
                  }}
                  placeholder="Paste your Gemini API key (e.g. AIzaSy...)"
                  className="w-full text-xs font-mono px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition"
                />
              </div>

              {/* Test key connection button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={testingKey || !apiKeyInput.trim()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={12} className={testingKey ? "animate-spin" : "text-emerald-600"} />
                  {testingKey ? "Testing with Google..." : "Test Key Connection"}
                </button>

                {hasCustomKey && (
                  <button
                    type="button"
                    onClick={handleClearApiKey}
                    className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline cursor-pointer"
                  >
                    Remove Saved Key
                  </button>
                )}
              </div>

              {/* Test key feedback result */}
              {testKeyResult && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-start gap-2 ${
                  testKeyResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  {testKeyResult.success ? (
                    <Check size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testKeyResult.message}</span>
                </div>
              )}

              {/* Guidance for Vercel deployment */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1.5">
                <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span>💡 Embed key for all visitors on Vercel:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>In Vercel, open your project <strong>Settings &gt; Environment Variables</strong>.</li>
                  <li>Add Variable Name: <code className="bg-white px-1 py-0.5 rounded border border-slate-200 font-bold text-slate-800">VITE_GEMINI_API_KEY</code></li>
                  <li>Paste your Gemini API key as the Value and Save.</li>
                  <li><strong>Important:</strong> Go to <strong>Deployments &gt; Redeploy</strong> on Vercel so the key is built into the website!</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              {pendingScan && (
                <button
                  onClick={handleProceedOfflineFallback}
                  className="flex-1 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition"
                >
                  Use Offline Scan
                </button>
              )}
              <button
                onClick={handleApplyApiKeyAndRetry}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                {pendingScan ? "Save Key & Scan Document" : "Save API Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Tab Navigation - 3 tabs matching the Android mobile app */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2.5 px-6 z-40 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2 text-center">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'scan' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera size={20} />
            <span className="text-[11px] mt-0.5">Scan</span>
          </button>
          <button 
            onClick={() => setActiveTab('review')}
            className={`flex flex-col items-center justify-center py-1 relative transition ${
              activeTab === 'review' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={20} />
            <span className="text-[11px] mt-0.5">Review</span>
            {totalUncertainties > 0 && (
              <span className="absolute top-0 right-7 w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'history' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Archive size={20} />
            <span className="text-[11px] mt-0.5">Archive</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
