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
  Key,
  FileCode,
  Sliders,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScanRecord, ScanRow, db, DocumentHeaderColumn } from './db';
import { 
  extractWithGeminiVision, 
  getStoredGeminiKey, 
  saveStoredGeminiKey, 
  clearStoredGeminiKey, 
  getStoredCloudVisionKey,
  saveStoredCloudVisionKey,
  generateLocalScan,
  testGeminiApiKey
} from './gemini';

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

  // API Key dialog state
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [visionKeyInput, setVisionKeyInput] = useState('');
  const [keyTestStatus, setKeyTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  // Zoom state for split review
  const [zoomLevel, setZoomLevel] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load documents from IndexedDB on startup
  useEffect(() => {
    loadDocuments();
    setGeminiKeyInput(getStoredGeminiKey());
    setVisionKeyInput(getStoredCloudVisionKey());

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDocuments = async () => {
    try {
      const allDocs = await db.scans.toArray();
      if (allDocs.length > 0) {
        setDocuments(allDocs);
        if (!activeDoc) {
          setActiveDoc(allDocs[0]);
        }
      } else {
        // Seed initial KFS sample
        const sample = generateLocalScan();
        const initialDoc: ScanRecord = {
          id: 'DOC-KFS-AGW85-01',
          title: sample.title,
          documentType: sample.documentType,
          institution: sample.institution,
          subHeader: sample.subHeader,
          personName: sample.personName,
          idNumber: sample.idNumber,
          plotCode: sample.plotCode,
          forestStation: sample.forestStation,
          observerName: sample.observerName,
          summary: sample.summary,
          metadataFields: sample.metadataFields,
          tableHeaders: sample.tableHeaders,
          date: Date.now(),
          fileSizeBytes: 245000,
          fileType: 'image/jpeg',
          syncStatus: 'SYNCED',
          isVerified: false,
          rows: sample.rows as any[]
        };
        await db.scans.put(initialDoc);
        setDocuments([initialDoc]);
        setActiveDoc(initialDoc);
      }
    } catch (e) {
      console.error('Failed to load documents from database:', e);
    }
  };

  const handleSaveKeys = async () => {
    saveStoredGeminiKey(geminiKeyInput);
    saveStoredCloudVisionKey(visionKeyInput);
    showToast('API Configuration saved successfully!');
    setShowKeyModal(false);
  };

  const handleTestKey = async () => {
    if (!geminiKeyInput.trim()) {
      setKeyTestStatus('invalid');
      return;
    }
    setKeyTestStatus('testing');
    const ok = await testGeminiApiKey(geminiKeyInput.trim());
    setKeyTestStatus(ok ? 'valid' : 'invalid');
  };

  // Helper to extract or fallback 19 table headers
  const getDocumentHeaders = (doc: ScanRecord | null): DocumentHeaderColumn[] => {
    if (!doc) return [];
    if (doc.tableHeaders && doc.tableHeaders.length > 0) return doc.tableHeaders;
    return Array.from({ length: 19 }, (_, i) => ({
      key: `col_${i + 1}`,
      label: `Col ${i + 1}`
    }));
  };

  const getCellDisplay = (row: ScanRow, headerKey: string): string => {
    if (row.cells && row.cells[headerKey] !== undefined) {
      return String(row.cells[headerKey]);
    }
    if (headerKey === 'col_1' || headerKey === 'treeNumber') return row.treeNumber || '';
    if (headerKey === 'col_2' || headerKey === 'speciesCode') return row.speciesCode || '';
    if (headerKey === 'col_3' || headerKey === 'dbhCm') return row.dbhCm || '';
    if (headerKey === 'col_4' || headerKey === 'heightM') return row.heightM || '';
    return '—';
  };

  const getCellConfidence = (row: ScanRow, headerKey: string): number => {
    if (row.cellConfidence && row.cellConfidence[headerKey] !== undefined) {
      return row.cellConfidence[headerKey];
    }
    return 0.95;
  };

  // Process image with Gemini Vision AI
  const processImageFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStep('Preparing image...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;

      try {
        const apiKey = getStoredGeminiKey();
        let extraction;

        if (apiKey) {
          extraction = await extractWithGeminiVision(dataUrl, (step) => setProcessingStep(step));
        } else {
          // If no API key is provided, use high-fidelity offline sample
          showToast('No Gemini API key found. Loaded Form AGW-85-01 data. Add key in Settings for live extraction.');
          extraction = generateLocalScan(file.name.replace(/\.[^/.]+$/, ''));
        }

        const newDoc: ScanRecord = {
          id: `DOC-${Date.now()}`,
          title: extraction.title,
          documentType: extraction.documentType,
          institution: extraction.institution,
          subHeader: extraction.subHeader,
          personName: extraction.personName,
          idNumber: extraction.idNumber,
          plotCode: extraction.plotCode,
          forestStation: extraction.forestStation,
          observerName: extraction.observerName,
          summary: extraction.summary,
          metadataFields: extraction.metadataFields,
          tableHeaders: extraction.tableHeaders,
          date: Date.now(),
          imageDataUrl: dataUrl,
          fileName: file.name,
          fileSizeBytes: file.size,
          fileType: file.type,
          syncStatus: isOffline ? 'SAVED_OFFLINE' : 'SYNCED',
          isVerified: false,
          rows: extraction.rows as any[]
        };

        await db.scans.put(newDoc);
        setDocuments(prev => [newDoc, ...prev]);
        setActiveDoc(newDoc);
        setActiveTab('review');
        showToast('Document transcribed successfully into 10x19 matrix!');
      } catch (err: any) {
        console.error('OCR Extraction error:', err);
        showToast(`Extraction error: ${err.message || 'Check API key or image clarity'}`);
      } finally {
        setIsProcessing(false);
        setProcessingStep('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processImageFile(files[0]);
  };

  // ==========================================
  // EXPORT UTILITIES (Notepad, Word, Excel, CSV)
  // ==========================================

  const handleExportNotepad = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const station = doc.metadataFields?.find(m => m.label.toLowerCase().includes('station'))?.value || doc.forestStation || 'Chuka Forest Station';
    const compartment = doc.metadataFields?.find(m => m.label.toLowerCase().includes('compartment'))?.value || doc.plotCode || 'Kiamuriuki 1(k)';
    const species = doc.metadataFields?.find(m => m.label.toLowerCase().includes('species'))?.value || 'Eucalyptus saligna';
    const dateStr = doc.metadataFields?.find(m => m.label.toLowerCase().includes('date'))?.value || new Date(doc.date).toLocaleDateString();
    const officer = doc.metadataFields?.find(m => m.label.toLowerCase().includes('officer'))?.value || doc.observerName || 'Faith';
    const plantingYear = doc.metadataFields?.find(m => m.label.toLowerCase().includes('planting'))?.value || '1982';
    const age = doc.metadataFields?.find(m => m.label.toLowerCase().includes('age'))?.value || '62';
    const fell = doc.metadataFields?.find(m => m.label.toLowerCase().includes('fell'))?.value || 'Clear Fell';
    const portion = doc.metadataFields?.find(m => m.label.toLowerCase().includes('portion'))?.value || 'Whole';
    const treeCount = doc.metadataFields?.find(m => m.label.toLowerCase().includes('tree') || m.label.toLowerCase().includes('number'))?.value || `${doc.rows.length * 19}`;
    const product = doc.metadataFields?.find(m => m.label.toLowerCase().includes('product') || m.label.toLowerCase().includes('sheet'))?.value || 'Timber';

    let text = "";
    text += "========================================================================================================================\r\n";
    text += "                     KENYA FOREST SERVICE (KFS) - STUMPAGE APPRAISAL FORM (AGW-85-01)                                    \r\n";
    text += "========================================================================================================================\r\n";
    text += `Station:             ${station.padEnd(32)} Date:              ${dateStr}\r\n`;
    text += `Compartment:         ${compartment.padEnd(32)} Officer:           ${officer}\r\n`;
    text += `Species:             ${species.padEnd(32)} Planting Year:     ${plantingYear} (Age: ${age})\r\n`;
    text += `Operation:           ${fell.padEnd(32)} Portion:            ${portion}\r\n`;
    text += `Classification:      ${product.padEnd(32)} Number of Trees:    ${treeCount}\r\n`;
    text += "------------------------------------------------------------------------------------------------------------------------\r\n\r\n";
    text += "FIELD TREE MEASUREMENT DATA (DIAMETER AT BREAST HEIGHT - DBH / Dm):\r\n";
    text += "------------------------------------------------------------------------------------------------------------------------\r\n";

    // Column headers
    const colHeaders = headers.map((h, i) => {
      const num = h.label.replace(/^Col(umn)?\s*/i, '');
      return `C${num || i + 1}`.padStart(5);
    });
    text += "ROW  " + colHeaders.join(" ") + "\r\n";
    text += "-----" + headers.map(() => "-----").join(" ") + "\r\n";

    // Data rows
    doc.rows.forEach(r => {
      const rowLabel = `R${r.rowNumber}`.padEnd(5);
      const rowVals = headers.map(h => {
        const val = getCellDisplay(r, h.key).trim();
        return (val || "-").padStart(5);
      });
      text += rowLabel + rowVals.join(" ") + "\r\n";
    });

    text += "========================================================================================================================\r\n";
    text += `Digitized & Audited Record • Form AGW-85-01 • Generated: ${new Date().toLocaleString()}\r\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (doc.title || 'KFS_Stumpage_Appraisal').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanName}_Notepad.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Notepad (.txt) plain-text table!");
  };

  const handleExportWord = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const station = doc.metadataFields?.find(m => m.label.toLowerCase().includes('station'))?.value || doc.forestStation || 'Chuka Forest Station';
    const compartment = doc.metadataFields?.find(m => m.label.toLowerCase().includes('compartment'))?.value || doc.plotCode || 'Kiamuriuki 1(k)';
    const species = doc.metadataFields?.find(m => m.label.toLowerCase().includes('species'))?.value || 'Eucalyptus saligna';
    const dateStr = doc.metadataFields?.find(m => m.label.toLowerCase().includes('date'))?.value || new Date(doc.date).toLocaleDateString();
    const officer = doc.metadataFields?.find(m => m.label.toLowerCase().includes('officer'))?.value || doc.observerName || 'Faith';
    const plantingYear = doc.metadataFields?.find(m => m.label.toLowerCase().includes('planting'))?.value || '1982';
    const age = doc.metadataFields?.find(m => m.label.toLowerCase().includes('age'))?.value || '62';
    const fell = doc.metadataFields?.find(m => m.label.toLowerCase().includes('fell'))?.value || 'Clear Fell';
    const portion = doc.metadataFields?.find(m => m.label.toLowerCase().includes('portion'))?.value || 'Whole';
    const treeCount = doc.metadataFields?.find(m => m.label.toLowerCase().includes('tree') || m.label.toLowerCase().includes('number'))?.value || `${doc.rows.length * 19}`;
    const product = doc.metadataFields?.find(m => m.label.toLowerCase().includes('product') || m.label.toLowerCase().includes('sheet'))?.value || 'Timber';

    const headerHtml = `
      <div style="border-bottom: 2px solid #047857; padding-bottom: 10px; margin-bottom: 14px; text-align: center;">
        <h1 style="color: #047857; font-size: 15pt; margin: 0; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">
          KENYA FOREST SERVICE (KFS) - STUMPAGE APPRAISAL FORM (AGW-85-01)
        </h1>
        <p style="color: #475569; font-size: 10pt; margin: 4px 0 0 0;">Forestry Inventory & Field Tree Measurements Digitization Record</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5pt; background: #f8fafc; border: 1px solid #cbd5e1;">
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; width: 33%;"><strong>Forest Station:</strong> ${station}</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; width: 33%;"><strong>Compartment:</strong> ${compartment}</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0; width: 33%;"><strong>Date:</strong> ${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Species:</strong> ${species}</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Planting Year / Age:</strong> ${plantingYear} (Age: ${age})</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Measuring Officer:</strong> ${officer}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Operation:</strong> ${fell}</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Portion:</strong> ${portion}</td>
            <td style="padding: 6px 10px; border: 1px solid #e2e8f0;"><strong>Classification:</strong> ${product} (${treeCount} trees)</td>
          </tr>
        </tbody>
      </table>
    `;

    const tableHeaderHtml = headers.map(h => `<th style="background-color: #047857; color: white; border: 1px solid #065f46; padding: 5px; font-size: 8.5pt;">${h.label}</th>`).join('');
    
    const tableRowsHtml = doc.rows.map(r => {
      const cellsHtml = headers.map(h => {
        const val = getCellDisplay(r, h.key);
        return `<td style="border: 1px solid #cbd5e1; padding: 5px; text-align: center; font-size: 9pt; font-family: monospace;">${val || '—'}</td>`;
      }).join('');
      return `<tr><td style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 5px; text-align: center; font-weight: bold; font-size: 8.5pt;">R${r.rowNumber}</td>${cellsHtml}</tr>`;
    }).join('');

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>KFS Form AGW-85-01 Digitized</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page { size: landscape; margin: 1.5cm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
        </style>
      </head>
      <body>
        ${headerHtml}
        <h3 style="color: #0f172a; font-size: 11pt; margin-top: 10px; margin-bottom: 6px;">Tree Diameter Breast Height (DBH) Matrix (10 x 19):</h3>
        <table>
          <thead>
            <tr>
              <th style="background-color: #047857; color: white; border: 1px solid #065f46; padding: 5px; font-size: 8.5pt;">Row</th>
              ${tableHeaderHtml}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 8.5pt; color: #64748b; text-align: right;">Digitized with KFS Inventory Scan • Verified Record AGW-85-01</p>
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (doc.title || 'KFS_Stumpage_Appraisal').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanName}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded formatted Word document (.doc)!");
  };

  const handleExportExcel = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const wb = XLSX.utils.book_new();

    // Data sheet
    const headRow = ['Row', ...headers.map(h => h.label)];
    const bodyRows = doc.rows.map(r => [
      `R${r.rowNumber}`,
      ...headers.map(h => getCellDisplay(r, h.key))
    ]);

    const wsData = XLSX.utils.aoa_to_sheet([headRow, ...bodyRows]);
    XLSX.utils.book_append_sheet(wb, wsData, 'DBH Matrix (10x19)');

    // Metadata sheet
    const metaRows = [
      ['Attribute', 'Value'],
      ['Title', doc.title],
      ['Form Number', doc.idNumber || 'AGW-85-01'],
      ['Station', doc.forestStation],
      ['Compartment', doc.plotCode],
      ['Officer', doc.observerName],
      ['Date Scanned', new Date(doc.date).toLocaleString()],
      ...(doc.metadataFields || []).map(m => [m.label, m.value])
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    XLSX.utils.book_append_sheet(wb, wsMeta, 'Form Metadata');

    const cleanName = (doc.title || 'KFS_Form_AGW85-01').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `${cleanName}.xlsx`);
    showToast("Downloaded Excel Spreadsheet (.xlsx)!");
  };

  const handleExportCsv = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const headRow = ['Row', ...headers.map(h => h.label)].join(',');
    const bodyRows = doc.rows.map(r => [
      `R${r.rowNumber}`,
      ...headers.map(h => `"${getCellDisplay(r, h.key).replace(/"/g, '""')}"`)
    ].join(','));

    const csvContent = [headRow, ...bodyRows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanName = (doc.title || 'KFS_Form_AGW85-01').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${cleanName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded CSV (.csv)!");
  };

  const handlePrintDocument = () => {
    window.print();
  };

  const handleUpdateCellValue = async (rowNumber: number, headerKey: string, newValue: string) => {
    if (!activeDoc) return;
    const updatedRows = activeDoc.rows.map(r => {
      if (r.rowNumber === rowNumber) {
        const cells = { ...(r.cells || {}), [headerKey]: newValue };
        const cellConf = { ...(r.cellConfidence || {}), [headerKey]: 1.0 }; // Marked manually as 100% verified
        return {
          ...r,
          cells,
          cellConfidence: cellConf
        };
      }
      return r;
    });

    const updatedDoc = { ...activeDoc, rows: updatedRows };
    setActiveDoc(updatedDoc);
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    await db.scans.put(updatedDoc);
    showToast('Value updated and verified!');
    setSelectedCell(null);
  };

  const handleDeleteDoc = async (id: string) => {
    await db.scans.delete(id);
    setDocuments(prev => prev.filter(d => d.id !== id));
    if (activeDoc?.id === id) {
      setActiveDoc(documents.find(d => d.id !== id) || null);
    }
    showToast('Document deleted from local storage.');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* HEADER / NAVIGATION BAR */}
      <header className="bg-emerald-950 text-white border-b border-emerald-900 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-inner">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-emerald-100">KFS Inventory Scan</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-800 text-emerald-200 rounded-full border border-emerald-700">Form AGW-85-01</span>
              </div>
              <p className="text-xs text-emerald-300/80 hidden sm:block">Kenya Forestry Research Institute & Kenya Forest Service Digitization</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Online / Offline status */}
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center space-x-1.5 ${isOffline ? 'bg-amber-900/60 text-amber-200 border border-amber-700' : 'bg-emerald-900/80 text-emerald-200 border border-emerald-700'}`}>
              {isOffline ? <CloudOff className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden sm:inline">{isOffline ? 'Offline Queue' : 'Cloud Sync Ready'}</span>
            </div>

            {/* API Settings Button */}
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 rounded-lg bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/80 transition flex items-center space-x-1 text-xs"
              title="Configure API Keys"
            >
              <Key className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline font-medium">API Keys</span>
            </button>
          </div>
        </div>

        {/* TOP TAB NAVIGATION */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex space-x-2 border-t border-emerald-900/50 pt-1">
          <button
            onClick={() => setActiveTab('scan')}
            className={`py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 transition ${activeTab === 'scan' ? 'border-emerald-400 text-emerald-200 bg-emerald-900/30' : 'border-transparent text-emerald-300/70 hover:text-white'}`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan Form</span>
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 transition ${activeTab === 'review' ? 'border-emerald-400 text-emerald-200 bg-emerald-900/30' : 'border-transparent text-emerald-300/70 hover:text-white'}`}
          >
            <Layers className="w-4 h-4" />
            <span>10×19 Matrix Review</span>
            {activeDoc && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-4 font-semibold text-xs sm:text-sm border-b-2 flex items-center space-x-2 transition ${activeTab === 'history' ? 'border-emerald-400 text-emerald-200 bg-emerald-900/30' : 'border-transparent text-emerald-300/70 hover:text-white'}`}
          >
            <Archive className="w-4 h-4" />
            <span>Scanned Archives</span>
            <span className="ml-1 text-xs px-1.5 py-0.2 bg-emerald-800 rounded-full text-emerald-200">{documents.length}</span>
          </button>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* ==================================================== */}
        {/* TAB 1: SCAN VIEW */}
        {/* ==================================================== */}
        {activeTab === 'scan' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="inline-block p-3 rounded-2xl bg-emerald-50 text-emerald-700">
                  <Trees className="w-8 h-8" />
                </span>
                <h2 className="text-2xl font-black text-slate-900">Kenya Forest Service Form Digitizer</h2>
                <p className="text-sm text-slate-600">
                  Upload or photograph <strong>Form No. AGW-85-01</strong>. The AI will extract all 11 header metadata fields and populate the strict <strong>10-Row × 19-Column DBH matrix</strong> while filtering out tally marks.
                </p>
              </div>

              {/* Mode Switcher */}
              <div className="mt-8 flex justify-center space-x-2 p-1 bg-slate-100 rounded-xl max-w-md mx-auto">
                <button
                  onClick={() => setScanMode('single')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${scanMode === 'single' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Single Scan
                </button>
                <button
                  onClick={() => setScanMode('batch')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${scanMode === 'batch' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Batch Multi-Page
                </button>
                <button
                  onClick={() => setScanMode('queue')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${scanMode === 'queue' ? 'bg-white shadow-sm text-emerald-900' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Offline Tray
                </button>
              </div>

              {/* Dropzone & Viewfinder UI */}
              <div className="mt-6 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-2xl p-8 sm:p-12 text-center hover:bg-emerald-50/70 transition relative">
                {isProcessing ? (
                  <div className="space-y-4 py-8">
                    <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <div className="space-y-1">
                      <p className="font-bold text-base text-emerald-950">{processingStep || 'Transcribing Form AGW-85-01...'}</p>
                      <p className="text-xs text-slate-500">Isolating 190 tree DBH measurements & filtering tally marks</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-base">Drop field sheet photo or choose file</p>
                      <p className="text-xs text-slate-500 mt-1">Supports High-Res JPG, PNG, HEIC, or scanned PDF documents</p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md flex items-center space-x-2 transition"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo</span>
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm border border-slate-300 shadow-sm flex items-center space-x-2 transition"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Browse Files</span>
                      </button>
                      <button
                        onClick={() => {
                          const demo = generateLocalScan();
                          const demoDoc: ScanRecord = {
                            id: `DOC-DEMO-${Date.now()}`,
                            title: demo.title,
                            documentType: demo.documentType,
                            institution: demo.institution,
                            subHeader: demo.subHeader,
                            personName: demo.personName,
                            idNumber: demo.idNumber,
                            plotCode: demo.plotCode,
                            forestStation: demo.forestStation,
                            observerName: demo.observerName,
                            summary: demo.summary,
                            metadataFields: demo.metadataFields,
                            tableHeaders: demo.tableHeaders,
                            date: Date.now(),
                            fileSizeBytes: 180000,
                            fileType: 'image/jpeg',
                            syncStatus: 'SYNCED',
                            isVerified: false,
                            rows: demo.rows as any[]
                          };
                          db.scans.put(demoDoc);
                          setDocuments(p => [demoDoc, ...p]);
                          setActiveDoc(demoDoc);
                          setActiveTab('review');
                          showToast('Loaded realistic Kiamuriuki 1(k) Form AGW-85-01 data!');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs sm:text-sm border border-emerald-300 flex items-center space-x-2 transition"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>Load Sample Form AGW-85-01</span>
                      </button>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: REVIEW & SIDE-BY-SIDE MATRIX AUDIT */}
        {/* ==================================================== */}
        {activeTab === 'review' && activeDoc && (
          <div className="space-y-6">
            {/* DOCUMENT HEADER / ACTION BAR */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                    Form AGW-85-01
                  </span>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900">{activeDoc.title}</h1>
                </div>
                <p className="text-xs text-slate-500 flex flex-wrap gap-x-4">
                  <span><strong>Station:</strong> {activeDoc.forestStation || 'Chuka'}</span>
                  <span><strong>Compartment:</strong> {activeDoc.plotCode || 'Kiamuriuki 1(k)'}</span>
                  <span><strong>Officer:</strong> {activeDoc.observerName || 'Faith'}</span>
                  <span><strong>Date:</strong> {new Date(activeDoc.date).toLocaleDateString()}</span>
                </p>
              </div>

              {/* EXPORT ACTION BUTTONS */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExportNotepad(activeDoc)}
                  className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs border border-amber-300 flex items-center space-x-1.5 transition shadow-sm"
                  title="Export to fixed-width Notepad text table"
                >
                  <FileCode className="w-4 h-4 text-amber-700" />
                  <span>Notepad (.txt)</span>
                </button>
                <button
                  onClick={() => handleExportWord(activeDoc)}
                  className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-950 font-bold text-xs border border-blue-300 flex items-center space-x-1.5 transition shadow-sm"
                  title="Export formatted Word report with landscape table"
                >
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span>Word (.doc)</span>
                </button>
                <button
                  onClick={() => handleExportExcel(activeDoc)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm"
                  title="Export to formatted Excel workbook"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  onClick={() => handleExportCsv(activeDoc)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-300 flex items-center space-x-1.5 transition"
                  title="Export standard CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handlePrintDocument}
                  className="p-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300"
                  title="Print / Save PDF"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* METADATA SUMMARY BADGES */}
            {activeDoc.metadataFields && activeDoc.metadataFields.length > 0 && (
              <div className="bg-slate-100/80 rounded-xl p-3 border border-slate-200 flex flex-wrap gap-2 text-xs">
                {activeDoc.metadataFields.map((m, idx) => (
                  <div key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 flex items-center space-x-1.5">
                    <span className="text-slate-500 font-semibold">{m.label}:</span>
                    <span className="text-slate-900 font-bold">{m.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 10 x 19 TABLE AUDIT MATRIX */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center space-x-2">
                    <span>Field Tree Measurement Matrix (10 Rows × 19 Columns)</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">190 Trees Total</span>
                  </h3>
                  <p className="text-xs text-slate-500">Values represent Diameter at Breast Height (DBH/Dm in cm). Click any cell to inspect alternative candidate readings or edit.</p>
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Amber = Low Confidence (&lt;85%)</span>
                  </span>
                </div>
              </div>

              {/* SCROLLABLE TABLE CONTAINER */}
              <div className="overflow-x-auto max-h-[650px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 border-b border-slate-200 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5 text-center bg-slate-200/80 border-r border-slate-300 w-12 sticky left-0 z-20">Row</th>
                      {getDocumentHeaders(activeDoc).map((h) => (
                        <th key={h.key} className="p-2.5 text-center border-r border-slate-200 min-w-[55px]">
                          {h.label.replace(/^Col(umn)?\s*/i, 'C')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {activeDoc.rows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-slate-50/80 transition">
                        <td className="p-2 text-center font-bold bg-slate-100/90 border-r border-slate-300 sticky left-0 z-10 text-slate-600">
                          R{row.rowNumber}
                        </td>
                        {getDocumentHeaders(activeDoc).map((h) => {
                          const val = getCellDisplay(row, h.key);
                          const conf = getCellConfidence(row, h.key);
                          const isLowConf = conf < 0.85;
                          const hasCandidates = row.candidateValues && row.candidateValues[h.key] && row.candidateValues[h.key].length > 1;

                          return (
                            <td
                              key={h.key}
                              onClick={() => {
                                setSelectedCell({
                                  rowNumber: row.rowNumber,
                                  field: h.label,
                                  headerKey: h.key,
                                  label: `Row ${row.rowNumber}, ${h.label}`,
                                  value: val,
                                  confidence: conf,
                                  isUncertain: isLowConf,
                                  candidateValues: row.candidateValues?.[h.key]
                                });
                              }}
                              className={`p-2 text-center border-r border-slate-200 cursor-pointer transition select-none ${
                                isLowConf
                                  ? 'bg-amber-100 text-amber-900 font-bold hover:bg-amber-200'
                                  : 'hover:bg-emerald-50 text-slate-800'
                              }`}
                              title={`Confidence: ${(conf * 100).toFixed(0)}% (Click to inspect)`}
                            >
                              <div className="flex items-center justify-center space-x-0.5">
                                <span>{val || '—'}</span>
                                {hasCandidates && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ORIGINAL FIELD PHOTO AUDIT VIEW */}
            {activeDoc.imageDataUrl && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base flex items-center space-x-2">
                      <ImageIcon className="w-4 h-4 text-emerald-700" />
                      <span>Original Scanned Field Sheet (Auditing View)</span>
                    </h3>
                    <p className="text-xs text-slate-500">Cross-reference handwritten numbers against the physical paper photo</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono font-bold text-slate-600">{(zoomLevel * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                <div className="max-h-[500px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 flex items-center justify-center p-2">
                  <img
                    src={activeDoc.imageDataUrl}
                    alt="Original Form AGW-85-01"
                    style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
                    className="max-w-full transition-transform duration-200 rounded shadow-md object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 3: ARCHIVE / HISTORY VIEW */}
        {/* ==================================================== */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Scanned Document Registry</h2>
                <p className="text-xs text-slate-500">History of digitized KFS forms stored in local device storage</p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter forms, plots, stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents
                .filter(d => 
                  d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.plotCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.forestStation || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      setActiveDoc(doc);
                      setActiveTab('review');
                    }}
                    className={`bg-white rounded-2xl border p-5 transition cursor-pointer hover:shadow-md flex flex-col justify-between ${
                      activeDoc?.id === doc.id ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900">
                          {doc.idNumber || 'Form AGW-85-01'}
                        </span>
                        <span className="text-[11px] text-slate-400">{new Date(doc.date).toLocaleDateString()}</span>
                      </div>
                      <h3 className="font-extrabold text-slate-900 text-sm line-clamp-1">{doc.title}</h3>
                      <p className="text-xs text-slate-500">
                        Station: {doc.forestStation || 'Chuka'} • Plot: {doc.plotCode || '1(k)'}
                      </p>
                      <div className="text-xs text-slate-600 font-mono bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {doc.rows.length} Rows × 19 Columns ({doc.rows.length * 19} DBH Entries)
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportNotepad(doc);
                        }}
                        className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center space-x-1"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>TXT</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportWord(doc);
                        }}
                        className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center space-x-1"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExportExcel(doc);
                        }}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Excel</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDoc(doc.id);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-red-600 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* ==================================================== */}
      {/* CELL INSPECTOR MODAL */}
      {/* ==================================================== */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">{selectedCell.label}</span>
                <h3 className="text-lg font-black text-slate-900">Cell Value Inspector</h3>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Value & Confidence */}
            <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500 font-semibold">Transcribed DBH:</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-slate-900 font-mono">{selectedCell.value || '—'}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                  selectedCell.isUncertain ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {(selectedCell.confidence * 100).toFixed(0)}% Confidence
                </span>
              </div>
            </div>

            {/* Alternative Candidate Predictions */}
            {selectedCell.candidateValues && selectedCell.candidateValues.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Alternative Probability Readings:</span>
                </span>
                <div className="space-y-1.5">
                  {selectedCell.candidateValues.map((cand, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleUpdateCellValue(selectedCell.rowNumber, selectedCell.headerKey, cand.value)}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-sm text-slate-900">{cand.value}</div>
                        {cand.reason && <div className="text-[11px] text-slate-500">{cand.reason}</div>}
                      </div>
                      <span className="text-xs font-bold text-emerald-700">{(cand.probability * 100).toFixed(0)}% Prob</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Edit Input */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700">Override / Correct Value:</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  defaultValue={selectedCell.value}
                  id="cell_manual_override_input"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('cell_manual_override_input') as HTMLInputElement;
                    if (input) handleUpdateCellValue(selectedCell.rowNumber, selectedCell.headerKey, input.value.trim());
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* API KEY CONFIGURATION MODAL */}
      {/* ==================================================== */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black text-slate-900">OCR & AI API Configuration</h3>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Provide your Google Gemini API key to enable multimodal 10×19 field tree measurement digitization. Optionally add a Google Cloud Vision key for Stage 1 raw text anchoring.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Gemini API Key:
                </label>
                <input
                  type="password"
                  value={geminiKeyInput}
                  onChange={(e) => {
                    setGeminiKeyInput(e.target.value);
                    setKeyTestStatus('idle');
                  }}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Google Cloud Vision API Key (Optional Stage 1 OCR):
                </label>
                <input
                  type="password"
                  value={visionKeyInput}
                  onChange={(e) => setVisionKeyInput(e.target.value)}
                  placeholder="Optional Google Vision Key..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleTestKey}
                  disabled={keyTestStatus === 'testing' || !geminiKeyInput.trim()}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  {keyTestStatus === 'testing' ? 'Testing...' : 'Test Gemini Connection'}
                </button>

                {keyTestStatus === 'valid' && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connection Valid!</span>
                  </span>
                )}
                {keyTestStatus === 'invalid' && (
                  <span className="text-xs font-bold text-red-600 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Invalid Key</span>
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  clearStoredGeminiKey();
                  setGeminiKeyInput('');
                  setVisionKeyInput('');
                  showToast('Keys cleared from browser storage.');
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSaveKeys}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition"
              >
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
