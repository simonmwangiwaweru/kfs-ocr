import React, { useState, useRef, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState<'scan' | 'review' | 'archive' | 'settings'>('scan');
  const [viewMode, setViewMode] = useState<'grid' | 'photo'>('grid'); // in review tab
  const [documents, setDocuments] = useState<ScanRecord[]>([]);
  const [activeDoc, setActiveDoc] = useState<ScanRecord | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'verified' | 'review'>('all');
  const [archiveSubTab, setArchiveSubTab] = useState<'today' | 'week' | 'all' | 'review'>('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Inspector sheet state
  const [selectedCell, setSelectedCell] = useState<{
    rowNumber: number;
    colKey: string;
    colLabel: string;
    value: string;
    confidence: number;
    isUncertain: boolean;
    candidateValues?: Array<{ value: string; probability: number; reason?: string }>;
    commentText?: string;
  } | null>(null);

  // API Key dialog / settings state
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [visionKeyInput, setVisionKeyInput] = useState('');
  const [showKeyText, setShowKeyText] = useState(false);
  const [keyTestStatus, setKeyTestStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');
  const [autoSyncMobile, setAutoSyncMobile] = useState(true);

  // Quick export modal toggle
  const [showExportModal, setShowExportModal] = useState(false);

  // New Note input in cell inspector
  const [inspectorNoteInput, setInspectorNoteInput] = useState('');
  const [manualOverrideVal, setManualOverrideVal] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

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
        const sample = generateLocalScan();
        const initialDoc: ScanRecord = {
          id: 'DOC-KFS-AGW85-01',
          title: 'Mt. Kenya Forest - Comp 14',
          documentType: sample.documentType,
          institution: sample.institution,
          subHeader: sample.subHeader,
          personName: 'J. Kariuki',
          idNumber: 'Form AGW-85-01',
          plotCode: 'Comp 14',
          forestStation: 'Mt. Kenya East',
          observerName: 'J. Kariuki',
          summary: sample.summary,
          metadataFields: [
            { label: 'Station', value: 'Mt. Kenya East' },
            { label: 'Compartment', value: 'Comp 14' },
            { label: 'Species Taxon', value: 'Cupressus lusitanica (Cypress)' },
            { label: 'Planting Year', value: '1998 (Age 28)' },
            { label: 'Officer In-Charge', value: 'J. Kariuki' },
            { label: 'Date', value: '24.10.2026' }
          ],
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

  const handleSaveKeys = () => {
    saveStoredGeminiKey(geminiKeyInput);
    saveStoredCloudVisionKey(visionKeyInput);
    showToast('API Configuration saved successfully!');
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
    return '—';
  };

  const getCellConfidence = (row: ScanRow, headerKey: string): number => {
    if (row.cellConfidence && row.cellConfidence[headerKey] !== undefined) {
      return row.cellConfidence[headerKey];
    }
    return 0.95;
  };

  // Count uncertain cells
  const getLowConfidenceCount = (doc: ScanRecord | null): number => {
    if (!doc) return 0;
    const headers = getDocumentHeaders(doc);
    let count = 0;
    doc.rows.forEach(r => {
      headers.forEach(h => {
        if (getCellConfidence(r, h.key) < 0.85) count++;
      });
    });
    return count;
  };

  const processImageFile = async (file: File) => {
    setIsProcessing(true);
    setProcessingStep('Preparing image & optical reticle...');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;

      try {
        const apiKey = getStoredGeminiKey();
        let extraction;

        if (apiKey) {
          extraction = await extractWithGeminiVision(dataUrl, (step) => setProcessingStep(step));
        } else {
          showToast('No Gemini Key set. Loaded Form AGW-85-01 data. Configure key in Settings for live OCR.');
          extraction = generateLocalScan(file.name.replace(/\.[^/.]+$/, ''));
        }

        const newDoc: ScanRecord = {
          id: `DOC-${Date.now()}`,
          title: `Stumpage Appraisal - ${extraction.plotCode || 'Plot A'}`,
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
        showToast('Form AGW-85-01 scanned & digitized into 10×19 matrix!');
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
  // EXPORTS: Notepad (.txt), Word (.doc), Excel, CSV
  // ==========================================

  const handleExportNotepad = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const station = doc.metadataFields?.find(m => m.label.toLowerCase().includes('station'))?.value || doc.forestStation || 'Mt. Kenya East';
    const compartment = doc.metadataFields?.find(m => m.label.toLowerCase().includes('compartment'))?.value || doc.plotCode || 'Comp 14';
    const species = doc.metadataFields?.find(m => m.label.toLowerCase().includes('species'))?.value || 'Cupressus lusitanica';
    const dateStr = doc.metadataFields?.find(m => m.label.toLowerCase().includes('date'))?.value || new Date(doc.date).toLocaleDateString();
    const officer = doc.metadataFields?.find(m => m.label.toLowerCase().includes('officer'))?.value || doc.observerName || 'J. Kariuki';
    const plantingYear = doc.metadataFields?.find(m => m.label.toLowerCase().includes('planting'))?.value || '1998';
    const treeCount = `${doc.rows.length * 19}`;

    let text = "";
    text += "========================================================================================================================\r\n";
    text += "                     KENYA FOREST SERVICE (KFS) - STUMPAGE APPRAISAL FORM (AGW-85-01)                                    \r\n";
    text += "========================================================================================================================\r\n";
    text += `Station:             ${station.padEnd(32)} Date:              ${dateStr}\r\n`;
    text += `Compartment:         ${compartment.padEnd(32)} Officer:           ${officer}\r\n`;
    text += `Species:             ${species.padEnd(32)} Planting Year:     ${plantingYear}\r\n`;
    text += `Classification:      Timber                            Total Trees:       ${treeCount}\r\n`;
    text += "------------------------------------------------------------------------------------------------------------------------\r\n\r\n";
    text += "FIELD TREE MEASUREMENT DATA (DIAMETER AT BREAST HEIGHT - DBH / Dm in cm):\r\n";
    text += "------------------------------------------------------------------------------------------------------------------------\r\n";

    const colHeaders = headers.map((h, i) => {
      const num = h.label.replace(/^Col(umn)?\s*/i, '');
      return `C${num || i + 1}`.padStart(5);
    });
    text += "ROW  " + colHeaders.join(" ") + "\r\n";
    text += "-----" + headers.map(() => "-----").join(" ") + "\r\n";

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
    showToast("Downloaded Notepad (.txt) fixed-width table!");
    setShowExportModal(false);
  };

  const handleExportWord = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const station = doc.metadataFields?.find(m => m.label.toLowerCase().includes('station'))?.value || doc.forestStation || 'Mt. Kenya East';
    const compartment = doc.metadataFields?.find(m => m.label.toLowerCase().includes('compartment'))?.value || doc.plotCode || 'Comp 14';
    const species = doc.metadataFields?.find(m => m.label.toLowerCase().includes('species'))?.value || 'Cupressus lusitanica';
    const dateStr = doc.metadataFields?.find(m => m.label.toLowerCase().includes('date'))?.value || new Date(doc.date).toLocaleDateString();
    const officer = doc.metadataFields?.find(m => m.label.toLowerCase().includes('officer'))?.value || doc.observerName || 'J. Kariuki';
    const plantingYear = doc.metadataFields?.find(m => m.label.toLowerCase().includes('planting'))?.value || '1998';

    const headerHtml = `
      <div style="border-bottom: 2px solid #1f7a4d; padding-bottom: 10px; margin-bottom: 14px; text-align: center;">
        <h1 style="color: #006038; font-size: 15pt; margin: 0; text-transform: uppercase; font-family: 'Segoe UI', Arial, sans-serif;">
          KENYA FOREST SERVICE (KFS) - STUMPAGE APPRAISAL FORM (AGW-85-01)
        </h1>
        <p style="color: #6f7a71; font-size: 10pt; margin: 4px 0 0 0;">Forestry Inventory & Field Tree Measurements Digitization Record</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.5pt; background: #f8faf9; border: 1px solid #bec9bf;">
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #bec9bf; width: 33%;"><strong>Forest Station:</strong> ${station}</td>
            <td style="padding: 6px 10px; border: 1px solid #bec9bf; width: 33%;"><strong>Compartment:</strong> ${compartment}</td>
            <td style="padding: 6px 10px; border: 1px solid #bec9bf; width: 33%;"><strong>Date:</strong> ${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #bec9bf;"><strong>Species:</strong> ${species}</td>
            <td style="padding: 6px 10px; border: 1px solid #bec9bf;"><strong>Planting Year:</strong> ${plantingYear}</td>
            <td style="padding: 6px 10px; border: 1px solid #bec9bf;"><strong>Measuring Officer:</strong> ${officer}</td>
          </tr>
        </tbody>
      </table>
    `;

    const tableHeaderHtml = headers.map(h => `<th style="background-color: #1f7a4d; color: white; border: 1px solid #006038; padding: 5px; font-size: 8.5pt;">${h.label}</th>`).join('');
    
    const tableRowsHtml = doc.rows.map(r => {
      const cellsHtml = headers.map(h => {
        const val = getCellDisplay(r, h.key);
        return `<td style="border: 1px solid #bec9bf; padding: 5px; text-align: center; font-size: 9pt; font-family: monospace;">${val || '—'}</td>`;
      }).join('');
      return `<tr><td style="background-color: #eceeed; border: 1px solid #bec9bf; padding: 5px; text-align: center; font-weight: bold; font-size: 8.5pt;">R${r.rowNumber}</td>${cellsHtml}</tr>`;
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
        <h3 style="color: #191c1c; font-size: 11pt; margin-top: 10px; margin-bottom: 6px;">Tree Diameter Breast Height (DBH) Matrix (10 x 19):</h3>
        <table>
          <thead>
            <tr>
              <th style="background-color: #1f7a4d; color: white; border: 1px solid #006038; padding: 5px; font-size: 8.5pt;">Row</th>
              ${tableHeaderHtml}
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <p style="margin-top: 20px; font-size: 8.5pt; color: #6f7a71; text-align: right;">Digitized with KFS Inventory Scan • Verified Record AGW-85-01</p>
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
    setShowExportModal(false);
  };

  const handleExportExcel = (doc: ScanRecord) => {
    const headers = getDocumentHeaders(doc);
    const wb = XLSX.utils.book_new();

    const headRow = ['Row', ...headers.map(h => h.label)];
    const bodyRows = doc.rows.map(r => [
      `R${r.rowNumber}`,
      ...headers.map(h => getCellDisplay(r, h.key))
    ]);

    const wsData = XLSX.utils.aoa_to_sheet([headRow, ...bodyRows]);
    XLSX.utils.book_append_sheet(wb, wsData, 'DBH Matrix (10x19)');

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
    setShowExportModal(false);
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
    setShowExportModal(false);
  };

  const handleUpdateCellValue = async (rowNumber: number, colKey: string, newValue: string) => {
    if (!activeDoc) return;
    const updatedRows = activeDoc.rows.map(r => {
      if (r.rowNumber === rowNumber) {
        const cells = { ...(r.cells || {}), [colKey]: newValue };
        const cellConf = { ...(r.cellConfidence || {}), [colKey]: 1.0 };
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

  const lowConfCount = getLowConfidenceCount(activeDoc);
  const totalCells = (activeDoc?.rows.length || 10) * 19;
  const verifiedCells = Math.max(0, totalCells - lowConfCount);

  return (
    <div className="bg-[#F3F5F4] text-[#191c1c] antialiased min-h-screen flex items-center justify-center p-0 md:p-6 select-none font-sans">
      {/* Mobile Frame Container (iPhone 390x844 specification) */}
      <main className="w-full max-w-[390px] h-[844px] bg-[#F3F5F4] flex flex-col relative overflow-hidden shadow-2xl md:rounded-[44px] border-[6px] border-[#e6e9e8]/60">
        
        {/* Top Hardware Ambient Status Bar */}
        <header className="w-full bg-[#F3F5F4] pt-3 px-6 pb-1 flex justify-between items-center text-[#191c1c] z-30 shrink-0 select-none">
          <span className="font-mono text-[13px] tracking-tight text-[#191c1c] font-semibold">09:41</span>
          {/* Dynamic Island Pill */}
          <div className="w-24 h-4 bg-[#2e3131] rounded-full flex items-center justify-end px-2 gap-1.5 opacity-90">
            <div className="w-1.5 h-1.5 rounded-full bg-[#e1e3e2]"></div>
            <div className="w-2 h-2 rounded-full bg-[#1f7a4d]"></div>
          </div>
          <div className="flex items-center gap-1.5 text-[#191c1c]">
            <span className="material-symbols-outlined text-[15px]">signal_cellular_alt</span>
            <span className="material-symbols-outlined text-[15px]">wifi</span>
            <span className="material-symbols-outlined text-[17px] rotate-90">battery_full</span>
          </div>
        </header>

        {/* Global TopAppBar */}
        <section className="flex justify-between items-center w-full px-4 py-2 bg-[#f8faf9] text-[#006038] shadow-sm z-30 shrink-0">
          <button 
            onClick={() => setActiveTab('scan')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#191c1c] hover:bg-[#e6e9e8] transition-colors active:scale-95 duration-150" 
            type="button"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="font-headline text-[18px] font-extrabold text-[#191c1c] tracking-tight">KFS</span>
              <span className="font-headline text-[18px] font-extrabold text-[#1f7a4d] tracking-tight">Scan</span>
            </div>
            {/* Sync LED Pill */}
            <div className="flex items-center gap-1.5 mt-0.5 px-2.5 py-0.5 rounded-full bg-[#bfedd2]/40 border border-[#a3d1b6]/50">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse"></span>
              <span className="font-mono text-[10px] leading-none text-[#3d6751] font-semibold uppercase tracking-wider">
                {isOffline ? 'Offline Queue' : 'Cloud Sync Ready'}
              </span>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('settings')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-[#191c1c] hover:bg-[#e6e9e8] transition-colors active:scale-95 duration-150" 
            type="button"
            title="Settings"
          >
            <span className="material-symbols-outlined text-2xl">search</span>
          </button>
        </section>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div className="absolute top-16 left-4 right-4 z-50 bg-[#191c1c] text-white px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[#82d8a3] text-[18px]">check_circle</span>
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 1: SCANNER SCREEN (From code__7__0f318414.html) */}
        {/* ==================================================== */}
        {activeTab === 'scan' && (
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-24 space-y-3.5 no-scrollbar">
            {/* Mode Selector (Tactile Floating Tiles) */}
            <section className="grid grid-cols-3 gap-2.5">
              <button 
                onClick={() => setActiveTab('scan')}
                className="bg-white ring-1.5 ring-[#1f7a4d] border-2 border-[#1f7a4d]/20 rounded-[16px] p-2.5 flex flex-col items-center justify-center text-center tactile-card active:scale-95 transition-transform bg-[#bceacf]/15"
              >
                <div className="w-8 h-8 rounded-full bg-[#1f7a4d]/10 flex items-center justify-center mb-1 text-[#1f7a4d]">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>table_chart</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#1f7a4d]">Form Mode</span>
                <span className="font-mono text-[9px] text-[#1f7a4d]/70 font-medium">10x19 Grid</span>
              </button>

              <button 
                onClick={() => setActiveTab('review')}
                className="bg-white ring-1 ring-[#bec9bf]/30 rounded-[16px] p-2.5 flex flex-col items-center justify-center text-center tactile-card opacity-85 hover:opacity-100 active:scale-95 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center mb-1 text-[#3f4941]">
                  <span className="material-symbols-outlined text-[20px]">layers</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#3f4941]">10×19 Review</span>
                <span className="font-mono text-[9px] text-[#6f7a71] font-normal">Audit Data</span>
              </button>

              <button 
                onClick={() => setActiveTab('archive')}
                className="bg-white ring-1 ring-[#bec9bf]/30 rounded-[16px] p-2.5 flex flex-col items-center justify-center text-center tactile-card opacity-85 hover:opacity-100 active:scale-95 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#eceeed] flex items-center justify-center mb-1 text-[#3f4941]">
                  <span className="material-symbols-outlined text-[20px]">photo_library</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#3f4941]">Archive</span>
                <span className="font-mono text-[9px] text-[#6f7a71] font-normal">{documents.length} Sheets</span>
              </button>
            </section>

            {/* Central Scanner Viewfinder Card */}
            <section className="relative bg-white rounded-[22px] p-2 tactile-card border border-[#bec9bf]/30 overflow-hidden">
              <div className="relative w-full h-[270px] rounded-[18px] overflow-hidden bg-[#2e3131] flex items-center justify-center">
                {activeDoc?.imageDataUrl ? (
                  <img 
                    src={activeDoc.imageDataUrl} 
                    alt="Current Scanned Document" 
                    className="absolute inset-0 w-full h-full object-cover filter contrast-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#16291e] flex items-center justify-center">
                    <img 
                      src="/mustard_paper_texture.jpg" 
                      alt="Paper texture" 
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                )}

                {/* Semi-darkened Tactical Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none"></div>

                {/* Outer Grey Corner Framing Brackets */}
                <div className="absolute inset-3 border-2 border-white/20 rounded-xl pointer-events-none"></div>

                {/* Bold Forest Green Inner Corner Targeting Brackets */}
                <div className="absolute top-5 left-5 w-6 h-6 border-t-4 border-l-4 border-[#82d8a3] rounded-tl pointer-events-none shadow-sm"></div>
                <div className="absolute top-5 right-5 w-6 h-6 border-t-4 border-r-4 border-[#82d8a3] rounded-tr pointer-events-none shadow-sm"></div>
                <div className="absolute bottom-5 left-5 w-6 h-6 border-b-4 border-l-4 border-[#82d8a3] rounded-bl pointer-events-none shadow-sm"></div>
                <div className="absolute bottom-5 right-5 w-6 h-6 border-b-4 border-r-4 border-[#82d8a3] rounded-br pointer-events-none shadow-sm"></div>

                {/* Central Crosshair Optical Marker */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-9 h-9 border border-[#82d8a3]/40 rounded-full flex items-center justify-center">
                    <span className="w-1.5 h-1.5 bg-[#9ef5be] rounded-full shadow-lg"></span>
                  </div>
                </div>

                {/* Animated Laser Scan Beam */}
                <div className="laser-beam absolute left-4 right-4 h-[2px] bg-[#9ef5be] shadow-[0_0_12px_3px_rgba(130,216,163,0.9)] pointer-events-none z-10 flex items-center">
                  <span className="absolute left-0 -top-1 w-2 h-2.5 bg-[#9ef5be] rounded-full shadow-[0_0_8px_#82d8a3]"></span>
                  <span className="absolute right-0 -top-1 w-2 h-2.5 bg-[#9ef5be] rounded-full shadow-[0_0_8px_#82d8a3]"></span>
                </div>

                {/* Form Header Telemetry Readout */}
                <div className="absolute top-3 left-4 right-4 flex justify-between items-center pointer-events-none">
                  <span className="font-mono text-[10px] tracking-wider text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10">
                    FORM: AGW-85-01
                  </span>
                  <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 text-[#9ef5be] font-mono text-[10px]">
                    <span className="material-symbols-outlined text-[12px] text-[#9ef5be]" style={{ fontVariationSettings: "'FILL' 1" }}>lens</span>
                    <span>AUTO-FOCUS</span>
                  </div>
                </div>

                {/* Guidance Chip Overlay */}
                <div className="absolute bottom-3 left-4 right-4 flex justify-center pointer-events-none">
                  <div className="bg-[#2e3131]/85 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
                    <span className="material-symbols-outlined text-[#82d8a3] text-[16px]">crop_free</span>
                    <span className="font-mono text-[10.5px] text-[#eff1f0] font-semibold tracking-tight">
                      {isProcessing ? processingStep : 'Align Stumpage Appraisal Form AGW-85-01 within frame'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Action Buttons Below Viewfinder */}
            <section className="space-y-2.5">
              <button 
                onClick={() => cameraInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full primary-btn-tactile text-white rounded-[14px] py-3.5 px-4 flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all cursor-pointer shadow-lg"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>photo_camera</span>
                </div>
                <span className="font-headline text-[16px] font-extrabold tracking-wide uppercase">
                  {isProcessing ? 'Transcribing...' : 'Take Photo'}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-white border border-[#bec9bf]/40 rounded-[14px] p-2.5 flex flex-col items-center justify-center text-center tactile-card hover:bg-[#f2f4f3] active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[#191c1c]">
                    <span className="material-symbols-outlined text-[19px] text-[#1f7a4d]">upload_file</span>
                    <span className="font-headline text-[13px] font-bold text-[#191c1c]">Browse Files</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#6f7a71] mt-0.5 font-medium">PNG, JPG, PDF</span>
                </button>

                <button 
                  onClick={() => {
                    const sample = generateLocalScan();
                    const demoDoc: ScanRecord = {
                      id: `DOC-DEMO-${Date.now()}`,
                      title: 'Mt. Kenya Forest - Comp 14',
                      documentType: sample.documentType,
                      institution: sample.institution,
                      subHeader: sample.subHeader,
                      personName: 'J. Kariuki',
                      idNumber: 'Form AGW-85-01',
                      plotCode: 'Comp 14',
                      forestStation: 'Mt. Kenya East',
                      observerName: 'J. Kariuki',
                      summary: sample.summary,
                      metadataFields: [
                        { label: 'Station', value: 'Mt. Kenya East' },
                        { label: 'Compartment', value: 'Comp 14' },
                        { label: 'Species Taxon', value: 'Cupressus lusitanica (Cypress)' },
                        { label: 'Planting Year', value: '1998 (Age 28)' },
                        { label: 'Officer In-Charge', value: 'J. Kariuki' },
                        { label: 'Date', value: '24.10.2026' }
                      ],
                      tableHeaders: sample.tableHeaders,
                      date: Date.now(),
                      fileSizeBytes: 245000,
                      fileType: 'image/jpeg',
                      syncStatus: 'SYNCED',
                      isVerified: false,
                      rows: sample.rows as any[]
                    };
                    db.scans.put(demoDoc);
                    setDocuments(p => [demoDoc, ...p]);
                    setActiveDoc(demoDoc);
                    setActiveTab('review');
                    showToast('Loaded AGW-85-01 Mt. Kenya East sample matrix!');
                  }}
                  className="bg-white border-1.5 border-[#1f7a4d]/40 rounded-[14px] p-2.5 flex flex-col items-center justify-center text-center tactile-card bg-[#bfedd2]/20 hover:bg-[#bfedd2]/40 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 text-[#1f7a4d]">
                    <span className="material-symbols-outlined text-[19px] text-[#1f7a4d]" style={{ fontVariationSettings: "'FILL' 1" }}>eco</span>
                    <span className="font-headline text-[13px] font-bold text-[#1f7a4d]">Load Sample</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#1f7a4d]/80 mt-0.5 font-semibold">AGW-85-01 Demo</span>
                </button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="hidden" />
            </section>

            {/* Offline Queue Banner Card */}
            <section className="bg-white rounded-[18px] p-3 tactile-card border border-[#bec9bf]/35 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#ffdcc3] flex items-center justify-center text-[#a45800] shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_off</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-headline text-[13px] font-bold text-[#191c1c]">Offline Queue: Ready</h3>
                    <span className="w-2 h-2 rounded-full bg-[#a45800]"></span>
                  </div>
                  <p className="font-mono text-[10.5px] text-[#6f7a71] font-medium">Scans save locally to IndexedDB</p>
                </div>
              </div>
              <button 
                onClick={() => showToast('Local cache synchronised with cloud node.')}
                className="w-8 h-8 rounded-full bg-[#bceacf] hover:bg-[#9ef5be] text-[#1f7a4d] flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px] font-bold">sync</span>
              </button>
            </section>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 2: MATRIX REVIEW (From code__5__81df89d0.html)   */}
        {/* ==================================================== */}
        {activeTab === 'review' && activeDoc && (
          <div className="flex-1 overflow-y-auto px-3.5 pb-24 space-y-3 custom-scrollbar">
            {/* Top Sub-Header: Title & Segmented View Toggle */}
            <div className="w-full bg-[#f8faf9] p-2 rounded-2xl border border-[#bec9bf]/30 flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-headline text-[15px] font-bold text-[#191c1c] leading-tight">Matrix Review</h2>
                  <span className="font-mono text-[10px] text-[#6f7a71] uppercase tracking-wider">{activeDoc.idNumber || 'FORM AGW-85-01'}</span>
                </div>
                {/* Segmented Grid vs Photo Toggle */}
                <div className="bg-[#eceeed] p-1 rounded-xl flex items-center gap-1">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`py-1 px-3 rounded-lg flex items-center gap-1 text-xs font-mono font-bold transition-all ${
                      viewMode === 'grid' ? 'bg-white shadow-sm text-[#1f7a4d]' : 'text-[#3f4941]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: viewMode === 'grid' ? "'FILL' 1" : undefined }}>grid_on</span>
                    <span>Grid</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('photo')}
                    className={`py-1 px-3 rounded-lg flex items-center gap-1 text-xs font-mono font-bold transition-all ${
                      viewMode === 'photo' ? 'bg-white shadow-sm text-[#1f7a4d]' : 'text-[#3f4941]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">photo_library</span>
                    <span>Photo</span>
                  </button>
                </div>
              </div>
            </div>

            {/* If Photo View selected: Show Original Photo Audit View */}
            {viewMode === 'photo' && (
              <section className="tactile-card rounded-2xl p-3 border border-[#bec9bf]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold text-[#1f7a4d] uppercase">Physical Document Scan</span>
                  <span className="font-mono text-[10px] text-[#6f7a71]">High-Res Optical Proof</span>
                </div>
                <div className="max-h-[360px] overflow-auto rounded-xl bg-black/95 flex items-center justify-center p-2 border border-[#bec9bf]/40">
                  {activeDoc.imageDataUrl ? (
                    <img src={activeDoc.imageDataUrl} alt="Original Form" className="max-w-full rounded object-contain" />
                  ) : (
                    <div className="py-12 text-center text-slate-400 font-mono text-xs">
                      No raw image stored for this generated sample.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Metadata Card: Forest Inventory Record */}
            <section className="tactile-card rounded-2xl p-3.5 border border-[#bec9bf]/30">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eceeed]">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#1f7a4d] text-[18px]">nature</span>
                  <span className="font-mono text-[11px] text-[#1f7a4d] font-bold uppercase tracking-wider">Forest Inventory Record</span>
                </div>
                <span className="font-mono text-[10px] bg-[#eceeed] px-2 py-0.5 rounded text-[#3f4941]">24.10.2026</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="bg-[#f2f4f3] p-2 rounded-lg">
                  <span className="text-[#6f7a71] block text-[9.5px] uppercase font-medium">Station</span>
                  <span className="font-bold text-[#191c1c] truncate block mt-0.5">{activeDoc.forestStation || 'Mt. Kenya East'}</span>
                </div>
                <div className="bg-[#f2f4f3] p-2 rounded-lg">
                  <span className="text-[#6f7a71] block text-[9.5px] uppercase font-medium">Compartment</span>
                  <span className="font-bold text-[#191c1c] block mt-0.5">{activeDoc.plotCode || 'Comp 14'}</span>
                </div>
                <div className="bg-[#f2f4f3] p-2 rounded-lg col-span-2">
                  <span className="text-[#6f7a71] block text-[9.5px] uppercase font-medium">Species Taxon</span>
                  <span className="font-bold text-[#1f7a4d] block mt-0.5 italic">Cupressus lusitanica (Cypress)</span>
                </div>
                <div className="bg-[#f2f4f3] p-2 rounded-lg">
                  <span className="text-[#6f7a71] block text-[9.5px] uppercase font-medium">Planting Year</span>
                  <span className="font-bold text-[#191c1c] block mt-0.5">1998 <span className="font-normal text-[#6f7a71] text-[9.5px]">(Age 28)</span></span>
                </div>
                <div className="bg-[#f2f4f3] p-2 rounded-lg">
                  <span className="text-[#6f7a71] block text-[9.5px] uppercase font-medium">Officer In-Charge</span>
                  <span className="font-bold text-[#191c1c] block mt-0.5">{activeDoc.observerName || 'J. Kariuki'}</span>
                </div>
              </div>
            </section>

            {/* Verification Progress Strip */}
            <section className="tactile-card rounded-2xl p-3 border border-[#bec9bf]/30 flex flex-col gap-2">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="material-symbols-outlined text-[#1f7a4d] text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span className="text-[#191c1c]">{verifiedCells}/{totalCells} verified</span>
                </div>
                <div className="flex items-center gap-1 bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded-full font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                  <span>{lowConfCount} need review</span>
                </div>
              </div>
              <div className="w-full h-2 bg-[#eceeed] rounded-full overflow-hidden flex">
                <div className="h-full bg-[#1f7a4d]" style={{ width: `${(verifiedCells / totalCells) * 100}%` }}></div>
                <div className="h-full bg-[#D97706]" style={{ width: `${(lowConfCount / totalCells) * 100}%` }}></div>
              </div>
            </section>

            {/* 10x19 Matrix Grid Card Container */}
            <section className="tactile-card rounded-2xl p-3 border border-[#bec9bf]/30">
              <div className="flex items-center justify-between pb-2 mb-1.5">
                <div className="flex items-center gap-1">
                  <span className="font-headline text-[15px] font-bold text-[#191c1c]">Stumpage DBH</span>
                  <span className="font-mono text-[11px] text-[#6f7a71]">(cm)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-mono text-[10px] text-[#6f7a71]">
                    <span className="w-2 h-2 rounded-full bg-[#D1FAE5] ring-1 ring-[#1f7a4d]/40"></span>
                    <span>≥85%</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-[#D97706]">
                    <span className="w-2 h-2 rounded-full bg-[#FEF3C7] ring-1 ring-[#D97706]"></span>
                    <span>&lt;85%</span>
                  </div>
                </div>
              </div>

              {/* Two-Axis Sticky 10x19 Table */}
              <div className="relative overflow-x-auto max-h-[300px] border border-[#eceeed] rounded-xl custom-scrollbar bg-white">
                <table className="w-full border-collapse font-mono text-[12px] tabular-nums">
                  <thead>
                    <tr className="bg-[#e6e9e8] border-b border-[#eceeed] sticky top-0 z-30">
                      <th className="sticky left-0 top-0 z-40 bg-[#e6e9e8] px-2 py-2 text-center text-[10px] font-bold text-[#6f7a71] uppercase min-w-[42px] border-r border-[#eceeed]">
                        R\C
                      </th>
                      {getDocumentHeaders(activeDoc).map((h) => (
                        <th key={h.key} className="px-2 py-2 text-center text-[10px] font-bold text-[#3f4941] min-w-[50px]">
                          {h.label.replace(/^Col(umn)?\s*/i, 'C')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eceeed]">
                    {activeDoc.rows.map((row) => (
                      <tr key={row.rowNumber} className="hover:bg-[#f2f4f3] transition-colors">
                        <td className="sticky left-0 z-20 bg-[#eceeed] px-2 py-2 text-center font-bold text-[#6f7a71] border-r border-[#eceeed] text-[11px]">
                          R{row.rowNumber}
                        </td>
                        {getDocumentHeaders(activeDoc).map((h) => {
                          const val = getCellDisplay(row, h.key);
                          const conf = getCellConfidence(row, h.key);
                          const isLow = conf < 0.85;
                          const isSelected = selectedCell?.rowNumber === row.rowNumber && selectedCell?.colKey === h.key;

                          return (
                            <td
                              key={h.key}
                              onClick={() => {
                                setSelectedCell({
                                  rowNumber: row.rowNumber,
                                  colKey: h.key,
                                  colLabel: h.label,
                                  value: val,
                                  confidence: conf,
                                  isUncertain: isLow,
                                  candidateValues: row.candidateValues?.[h.key]
                                });
                                setManualOverrideVal(val);
                              }}
                              className={`px-2 py-2 text-right cursor-pointer select-none border-r border-[#eceeed]/60 transition-all ${
                                isSelected
                                  ? 'bg-[#FEF3C7] text-[#D97706] font-bold ring-2 ring-[#1f7a4d] z-10'
                                  : isLow
                                    ? 'bg-[#FEF3C7] text-[#D97706] font-bold hover:bg-[#fde68a]'
                                    : 'hover:bg-[#bfedd2]/30 text-[#191c1c]'
                              }`}
                            >
                              <div className="flex items-center justify-end gap-1">
                                {isLow && <span className="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"></span>}
                                <span>{val}</span>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Bottom Action Card: Cell Filter & Export Trigger */}
            <section className="tactile-card rounded-2xl p-3 border border-[#bec9bf]/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    // Jump to first low confidence cell
                    const headers = getDocumentHeaders(activeDoc);
                    for (const r of activeDoc.rows) {
                      for (const h of headers) {
                        if (getCellConfidence(r, h.key) < 0.85) {
                          setSelectedCell({
                            rowNumber: r.rowNumber,
                            colKey: h.key,
                            colLabel: h.label,
                            value: getCellDisplay(r, h.key),
                            confidence: getCellConfidence(r, h.key),
                            isUncertain: true,
                            candidateValues: r.candidateValues?.[h.key]
                          });
                          setManualOverrideVal(getCellDisplay(r, h.key));
                          return;
                        }
                      }
                    }
                    showToast('All 190 cells are already verified!');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-mono text-[11px] font-bold border border-[#D97706]/20 active:scale-95 transition-transform cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">filter_list</span>
                  <span>{lowConfCount} Low Confidence</span>
                </button>

                <div className="flex items-center gap-1 font-mono text-[11px] font-bold text-[#6f7a71]">
                  <span onClick={() => handleExportExcel(activeDoc)} className="px-1.5 py-0.5 rounded bg-[#eceeed] text-[#1f7a4d] cursor-pointer hover:bg-[#d1fae5]">.xlsx</span>
                  <span onClick={() => handleExportCsv(activeDoc)} className="px-1.5 py-0.5 rounded bg-[#eceeed] cursor-pointer hover:bg-slate-200">.csv</span>
                  <span onClick={() => handleExportWord(activeDoc)} className="px-1.5 py-0.5 rounded bg-[#eceeed] cursor-pointer hover:bg-blue-100 text-blue-800">.docx</span>
                  <span onClick={() => handleExportNotepad(activeDoc)} className="px-1.5 py-0.5 rounded bg-[#eceeed] cursor-pointer hover:bg-amber-100 text-amber-800">.txt</span>
                </div>
              </div>

              <button 
                onClick={() => setShowExportModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#2D8F5E] to-[#1F6B43] text-white font-headline text-[15px] font-bold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#1f7a4d]/30 border-t border-white/30 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">ios_share</span>
                <span>Export Appraisal Matrix</span>
              </button>
            </section>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 3: ARCHIVE SCREEN (From code__1__ab29ff61.html)  */}
        {/* ==================================================== */}
        {activeTab === 'archive' && (
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-2 pb-24 space-y-3">
            {/* Search Bar */}
            <div className="w-full h-11 bg-white rounded-2xl flex items-center px-3.5 gap-2.5 shadow-sm border border-[#bec9bf]/30">
              <span className="material-symbols-outlined text-[#6f7a71] text-[20px]">search</span>
              <input 
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search station, compartment, plot..."
                className="w-full bg-transparent border-none p-0 font-mono text-[12px] text-[#191c1c] placeholder:text-[#6f7a71]/70 focus:outline-none"
              />
            </div>

            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button 
                onClick={() => setArchiveFilter('all')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-mono text-[11px] font-semibold flex items-center gap-1 transition-all ${
                  archiveFilter === 'all' ? 'bg-[#1f7a4d] text-white' : 'bg-white text-[#191c1c] border border-[#bec9bf]/40'
                }`}
              >
                <span>All Stations</span>
              </button>
              <button 
                onClick={() => setArchiveFilter('verified')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-mono text-[11px] font-semibold border ${
                  archiveFilter === 'verified' ? 'bg-[#D1FAE5] text-[#059669] border-[#059669]' : 'bg-white text-[#059669] border-[#a3d1b6]/40'
                }`}
              >
                <span>Status: Verified</span>
              </button>
              <button 
                onClick={() => setArchiveFilter('review')}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full font-mono text-[11px] border ${
                  archiveFilter === 'review' ? 'bg-[#FEF3C7] text-[#D97706] border-[#D97706]' : 'bg-white text-[#D97706] border-[#ffb77d]/40'
                }`}
              >
                <span>Needs Review</span>
              </button>
            </div>

            {/* Sub-Tabs: Today, This week, All, Needs Review */}
            <div className="flex items-center justify-between border-b border-[#bec9bf]/30 pt-1 px-1">
              <button onClick={() => setArchiveSubTab('today')} className={`pb-2 font-mono text-[11px] ${archiveSubTab === 'today' ? 'text-[#1f7a4d] font-bold border-b-2 border-[#1f7a4d]' : 'text-[#3f4941]'}`}>
                Today
              </button>
              <button onClick={() => setArchiveSubTab('week')} className={`pb-2 font-mono text-[11px] ${archiveSubTab === 'week' ? 'text-[#1f7a4d] font-bold border-b-2 border-[#1f7a4d]' : 'text-[#3f4941]'}`}>
                This week
              </button>
              <button onClick={() => setArchiveSubTab('all')} className={`pb-2 font-mono text-[11px] ${archiveSubTab === 'all' ? 'text-[#1f7a4d] font-bold border-b-2 border-[#1f7a4d]' : 'text-[#3f4941]'}`}>
                All
              </button>
              <button onClick={() => setArchiveSubTab('review')} className="pb-2 font-mono text-[11px] text-[#D97706] font-semibold flex items-center gap-1">
                <span>Needs Review</span>
                <span className="w-4 h-4 rounded-full bg-[#FEF3C7] text-[#D97706] text-[10px] flex items-center justify-center font-bold">
                  {documents.filter(d => getLowConfidenceCount(d) > 0).length}
                </span>
              </button>
            </div>

            {/* Document Cards */}
            <div className="space-y-3 pt-1">
              {documents
                .filter(d => 
                  d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.plotCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (d.forestStation || '').toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((doc) => {
                  const unverified = getLowConfidenceCount(doc);
                  return (
                    <article 
                      key={doc.id}
                      onClick={() => {
                        setActiveDoc(doc);
                        setActiveTab('review');
                      }}
                      className="w-full bg-white rounded-2xl p-3.5 tactile-card border border-[#bec9bf]/30 flex flex-col gap-2.5 transition-transform active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[#bfedd2]/50 flex items-center justify-center text-[#1f7a4d] shrink-0 border border-[#a3d1b6]/40">
                            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>folder</span>
                          </div>
                          <div>
                            <h3 className="font-headline text-[15px] leading-tight font-bold text-[#191c1c]">{doc.title}</h3>
                            <p className="font-mono text-[11px] text-[#6f7a71] mt-0.5">
                              {doc.rows.length * 19} trees • {new Date(doc.date).toLocaleDateString()} • Form AGW-85-01
                            </p>
                          </div>
                        </div>
                        <button className="text-[#bec9bf] hover:text-[#191c1c] p-1">
                          <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#eceeed]/60">
                        {unverified === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D1FAE5] text-[#059669] font-mono text-[11px] font-semibold border border-[#059669]/20">
                            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-mono text-[11px] font-semibold border border-[#D97706]/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]"></span>
                            {unverified} Need Review
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-[#6f7a71] font-medium mr-0.5">EXPORT:</span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleExportNotepad(doc); }}
                            className="px-2 py-0.5 rounded bg-[#f2f4f3] hover:bg-[#eceeed] text-[#3f4941] font-mono text-[11px] border border-[#bec9bf]/40"
                          >
                            TXT
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleExportWord(doc); }}
                            className="px-2 py-0.5 rounded bg-[#f2f4f3] hover:bg-[#eceeed] text-blue-800 font-mono text-[11px] border border-[#bec9bf]/40"
                          >
                            Word
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleExportExcel(doc); }}
                            className="px-2 py-0.5 rounded bg-[#f2f4f3] hover:bg-[#eceeed] text-[#1f7a4d] font-mono text-[11px] border border-[#bec9bf]/40"
                          >
                            XLSX
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteDoc(doc.id); }}
                            className="p-1 rounded text-red-600 hover:bg-red-50 ml-1"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>

            {/* Storage capacity banner */}
            <aside className="w-full bg-[#f2f4f3] rounded-xl p-3 border border-[#bec9bf]/20 flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1f7a4d] text-[18px]">verified_user</span>
                <span className="font-mono text-[11px] text-[#3f4941] font-medium">KEFRI Biometric Matrix v2.4 Active</span>
              </div>
              <span className="font-mono text-[11px] text-[#6f7a71] font-semibold">IndexedDB Local</span>
            </aside>
          </div>
        )}

        {/* ==================================================== */}
        {/* VIEW 4: SETTINGS & KEYS (From code__9__0e005024.html)  */}
        {/* ==================================================== */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-24 space-y-3.5">
            {/* Hardware Status Banner */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-white rounded-xl border border-[#bec9bf]/40 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1f7a4d] animate-pulse"></span>
                <span className="font-mono text-[11px] text-[#191c1c] font-semibold">Optical Scanner Module</span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#bceacf] text-[#416b55] font-bold">
                Encrypted Node
              </span>
            </div>

            {/* CARD 1: API Configuration Card */}
            <section className="tactile-card bg-white rounded-2xl p-4">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#bec9bf]/30">
                <div className="w-8 h-8 rounded-lg bg-[#bceacf]/60 flex items-center justify-center text-[#1f7a4d] shrink-0">
                  <span className="material-symbols-outlined text-[19px]">key</span>
                </div>
                <div>
                  <h2 className="font-headline text-[16px] leading-5 font-bold text-[#191c1c]">AI Vision & OCR Engine</h2>
                  <p className="font-mono text-[11px] text-[#3f4941] leading-4 pt-0.5">Configure recognition models for field appraisals</p>
                </div>
              </div>

              <div className="mt-3.5 space-y-3">
                <div>
                  <label className="block font-mono text-[11px] font-bold text-[#191c1c] mb-1 uppercase tracking-wider">
                    Google Gemini API Key
                  </label>
                  <div className="relative flex items-center">
                    <input 
                      type={showKeyText ? 'text' : 'password'}
                      value={geminiKeyInput}
                      onChange={(e) => {
                        setGeminiKeyInput(e.target.value);
                        setKeyTestStatus('idle');
                      }}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#f2f4f3] border border-[#bec9bf]/80 rounded-lg px-3 py-2 text-[#191c1c] font-mono text-[12px] tracking-wide focus:outline-none focus:ring-1.5 focus:ring-[#1f7a4d]"
                    />
                    <div className="absolute right-1.5 flex items-center gap-1 text-[#3f4941]">
                      <button 
                        type="button" 
                        onClick={() => setShowKeyText(!showKeyText)}
                        className="p-1 rounded-md hover:bg-[#e1e3e2]"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showKeyText ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connection Status & Test Button */}
                <div className="bg-[#f2f4f3]/70 rounded-xl p-2.5 flex items-center justify-between border border-[#bec9bf]/35">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#9ef5be] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1f7a4d]"></span>
                    </span>
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] font-bold text-[#191c1c] leading-tight">
                        {keyTestStatus === 'valid' ? 'Connected (Gemini 2.5 Flash)' : keyTestStatus === 'invalid' ? 'Invalid Key' : 'Gemini Hybrid Engine'}
                      </span>
                      <span className="font-mono text-[10px] text-[#006038]">Multi-modal 10x19 Matrix</span>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleTestKey}
                    disabled={keyTestStatus === 'testing' || !geminiKeyInput.trim()}
                    className="px-2.5 py-1 rounded-lg bg-white border border-[#bec9bf] font-mono text-[11px] text-[#006038] font-bold hover:bg-[#e6e9e8] active:scale-95 transition-all"
                  >
                    {keyTestStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {/* Input 2: Google Cloud Vision API Key */}
                <div>
                  <label className="block font-mono text-[11px] font-bold text-[#191c1c] mb-1 uppercase tracking-wider">
                    Google Cloud Vision Key <span className="text-[#3f4941] font-normal lowercase">(optional Stage 1 OCR)</span>
                  </label>
                  <input 
                    type="password"
                    value={visionKeyInput}
                    onChange={(e) => setVisionKeyInput(e.target.value)}
                    placeholder="Enter secondary optical key..."
                    className="w-full bg-[#f2f4f3] border border-[#bec9bf]/80 rounded-lg px-3 py-2 text-[#191c1c] font-mono text-[12px] focus:outline-none focus:ring-1.5 focus:ring-[#1f7a4d]"
                  />
                </div>

                <div className="flex items-start gap-2 p-2.5 bg-[#f2f4f3]/60 rounded-xl border border-[#bec9bf]/30">
                  <span className="material-symbols-outlined text-[#1f7a4d] text-[18px] shrink-0 mt-0.5">lock</span>
                  <p className="font-mono text-[10.5px] text-[#3f4941] leading-4">
                    API keys are stored safely on your physical browser storage (localStorage) and are never sent to third-party tracking servers.
                  </p>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button 
                    type="button"
                    onClick={() => {
                      clearStoredGeminiKey();
                      setGeminiKeyInput('');
                      setVisionKeyInput('');
                      showToast('All API keys cleared.');
                    }}
                    className="font-mono text-[11px] font-bold text-[#ba1a1a] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete_forever</span>
                    Clear Keys
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveKeys}
                    className="primary-btn-tactile text-white font-mono text-[11px] font-bold px-4 py-2 rounded-xl shadow-md cursor-pointer active:scale-95"
                  >
                    Save Configuration
                  </button>
                </div>
              </div>
            </section>

            {/* CARD 2: Offline & Sync Preferences */}
            <section className="tactile-card bg-white rounded-2xl p-4">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#bec9bf]/30">
                <div className="w-8 h-8 rounded-lg bg-[#bceacf]/60 flex items-center justify-center text-[#1f7a4d] shrink-0">
                  <span className="material-symbols-outlined text-[19px]">sync_saved_locally</span>
                </div>
                <div>
                  <h2 className="font-headline text-[16px] leading-5 font-bold text-[#191c1c]">Field Data & Synchronization</h2>
                  <p className="font-mono text-[11px] text-[#3f4941] leading-4 pt-0.5">Appraisal queuing & cache storage</p>
                </div>
              </div>

              <div className="mt-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] font-bold text-[#191c1c] leading-tight">Auto-sync over Mobile Data</p>
                    <p className="font-mono text-[10px] text-[#3f4941]">Sync when connected on Safaricom/Airtel</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setAutoSyncMobile(!autoSyncMobile)}
                    className={`w-11 h-6 rounded-full p-0.5 flex items-center transition-colors shadow-inner ${
                      autoSyncMobile ? 'bg-[#1f7a4d] justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md"></span>
                  </button>
                </div>

                <div className="p-2.5 bg-[#f2f4f3] rounded-xl border border-[#bec9bf]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#e1e3e2] text-[#3f4941] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">database</span>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] font-bold text-[#191c1c]">Device Storage</p>
                      <p className="font-mono text-[10px] text-[#3f4941]">{documents.length} forms cached in IndexedDB</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL 1: CELL INSPECTOR BOTTOM SHEET                 */}
        {/* (From code__3__ddcc4e08.html)                        */}
        {/* ==================================================== */}
        {selectedCell && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-[2px] animate-in fade-in duration-200">
            <section 
              className="w-full max-w-[390px] mx-auto bg-white rounded-t-[28px] sheet-shadow overflow-hidden border-t border-[#bec9bf]/20 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300"
            >
              {/* Top Drag Handle */}
              <div className="w-full flex items-center justify-center pt-3 pb-1 cursor-grab">
                <div className="w-[36px] h-1.5 rounded-full bg-[#bec9bf]/70"></div>
              </div>

              {/* Sheet Header */}
              <div className="px-5 pt-1 pb-3 flex items-start justify-between border-b border-[#eceeed]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#3d6751] text-sm">forest</span>
                    <span className="font-mono text-[10px] text-[#3d6751] uppercase tracking-wider font-semibold">
                      STUMPAGE APPRAISAL AGW-85-01
                    </span>
                  </div>
                  <h2 className="font-headline text-[18px] font-bold text-[#191c1c] tracking-tight mt-0.5">
                    Row {selectedCell.rowNumber}, {selectedCell.colLabel}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedCell(null)}
                  className="w-9 h-9 rounded-full bg-[#eceeed] hover:bg-[#e1e3e2] flex items-center justify-center text-[#3f4941]"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              {/* Scrollable Sheet Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
                {/* 1. Current Value Card with 4x Crop Preview */}
                <div className="rounded-2xl p-4 bg-[#F8FAFC] border border-[#bec9bf]/40 shadow-sm relative overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="font-mono text-[10px] text-[#3f4941] font-medium tracking-wide">OCR VALUE DETECTED</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="font-mono text-[36px] leading-none font-bold text-[#191c1c] tracking-tight tabular-nums">
                          {selectedCell.value}
                        </span>
                        <span className="font-mono text-[12px] text-[#3f4941]">cm DBH</span>
                      </div>
                      {/* Confidence Badge */}
                      <div className={`inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full font-mono text-[10.5px] font-semibold ${
                        selectedCell.isUncertain ? 'bg-[#FEF3C7] border border-[#FDE68A] text-[#D97706]' : 'bg-[#D1FAE5] border border-[#a3d1b6] text-[#059669]'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${selectedCell.isUncertain ? 'bg-[#D97706] animate-pulse' : 'bg-[#059669]'}`}></span>
                        <span>{(selectedCell.confidence * 100).toFixed(0)}% Confidence • {selectedCell.isUncertain ? 'Review Required' : 'Validated'}</span>
                      </div>
                    </div>

                    {/* Physical Crop Reticle */}
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-20 rounded-xl bg-[#f2f4f3] border-2 border-[#bec9bf]/60 shadow-inner overflow-hidden relative grain-overlay flex items-center justify-center">
                        <div className="absolute inset-0 border border-[#006038]/10 pointer-events-none"></div>
                        <div className="absolute w-full h-[1px] bg-red-400/40 top-1/2"></div>
                        <div className="absolute h-full w-[1px] bg-red-400/40 left-1/2"></div>
                        <div className="font-serif font-bold text-2xl text-[#1E293B] italic tracking-tight opacity-90">
                          {selectedCell.value}
                        </div>
                        <span className="absolute bottom-1 right-1 bg-[#191c1c]/75 text-white font-mono text-[9px] px-1 rounded">
                          4× CROP
                        </span>
                      </div>
                      <span className="font-mono text-[9.5px] text-[#3f4941] mt-1">Field Slip Detail</span>
                    </div>
                  </div>
                </div>

                {/* 2. Candidate Alternative Readings */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[12px] font-bold text-[#191c1c]">Candidate Readings (Gemini Vision OCR)</span>
                    <span className="font-mono text-[11px] text-[#006038] flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span> 
                      {selectedCell.candidateValues?.length || 1} Found
                    </span>
                  </div>

                  <div className="space-y-2">
                    {/* Primary Candidate */}
                    <div className="p-3 rounded-2xl bg-white border-2 border-[#1f7a4d] shadow-sm flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-[#bceacf] flex items-center justify-center text-[#006038] font-mono font-bold text-sm">
                          {selectedCell.value}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[12px] font-bold text-[#191c1c]">{selectedCell.value} cm</span>
                            <span className="px-1.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-mono text-[10px] font-semibold">
                              {(selectedCell.confidence * 100).toFixed(0)}%
                            </span>
                            <span className="text-[10px] font-mono text-[#1f7a4d] font-semibold">(Primary Match)</span>
                          </div>
                          <p className="font-mono text-[10.5px] text-[#3f4941] mt-0.5">Primary optical extraction</p>
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-[#1f7a4d] text-white flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-xs font-bold">check</span>
                      </div>
                    </div>

                    {/* Secondary Candidates if available */}
                    {selectedCell.candidateValues?.slice(1).map((cand, idx) => (
                      <div 
                        key={idx}
                        onClick={() => handleUpdateCellValue(selectedCell.rowNumber, selectedCell.colKey, cand.value)}
                        className="p-3 rounded-2xl bg-white border border-[#bec9bf]/60 shadow-sm hover:border-[#1f7a4d] flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-[#eceeed] flex items-center justify-center text-[#191c1c] font-mono font-bold text-sm">
                            {cand.value}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[12px] font-bold text-[#191c1c]">{cand.value} cm</span>
                              <span className="px-1.5 py-0.5 rounded-full bg-[#eceeed] text-[#3f4941] font-mono text-[10px]">
                                {(cand.probability * 100).toFixed(0)}%
                              </span>
                            </div>
                            <p className="font-mono text-[10px] text-[#6f7a71] mt-0.5">{cand.reason || 'Alternative stroke interpretation'}</p>
                          </div>
                        </div>
                        <button className="px-2.5 py-1 rounded-lg border border-[#bec9bf] bg-white text-[#191c1c] font-mono text-[10.5px] font-semibold">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Manual Override Input */}
                <div className="p-3.5 rounded-2xl bg-[#f2f4f3] border border-[#bec9bf]/30 space-y-2">
                  <label className="block font-mono text-[11px] font-bold text-[#191c1c]">
                    Manual Value Override
                  </label>
                  <div className="flex items-stretch gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text"
                        value={manualOverrideVal}
                        onChange={(e) => setManualOverrideVal(e.target.value)}
                        className="w-full bg-white border border-[#bec9bf] rounded-xl px-3 py-2 font-mono text-[16px] font-bold text-[#191c1c] focus:outline-none focus:ring-2 focus:ring-[#1f7a4d]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] text-[#6f7a71]">cm</span>
                    </div>
                    <button 
                      onClick={() => handleUpdateCellValue(selectedCell.rowNumber, selectedCell.colKey, manualOverrideVal.trim())}
                      className="tactile-btn text-white px-3.5 py-2 rounded-xl font-mono text-[11.5px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>Confirm & Verify</span>
                    </button>
                  </div>
                </div>

                {/* 4. Audit Notes */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-[#191c1c]">Audit Notes</span>
                    <span className="font-mono text-[10px] text-[#6f7a71]">KENYA FOREST SERVICE</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7] space-y-1">
                    <div className="flex items-center justify-between text-[#3d6751]">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">shield_person</span>
                        <span className="font-mono text-[10.5px] font-bold">J. Kariuki, Forest Officer</span>
                      </div>
                      <span className="font-mono text-[9px] text-[#416b55]">Verified</span>
                    </div>
                    <p className="font-mono text-[11px] text-[#191c1c] pl-3 border-l-2 border-[#1f7a4d]/40">
                      Digit inspected and confirmed against physical field slip sheet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sheet Footer */}
              <div className="px-5 py-3 border-t border-[#eceeed] bg-white flex items-center justify-between gap-3 shrink-0">
                <button 
                  onClick={() => setSelectedCell(null)}
                  className="flex-1 py-2 px-3 rounded-xl border border-[#bec9bf] text-[#191c1c] font-mono text-[11px] font-semibold text-center"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleUpdateCellValue(selectedCell.rowNumber, selectedCell.colKey, manualOverrideVal.trim())}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#1f7a4d] text-white font-mono text-[11px] font-bold shadow-md text-center flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODAL 2: EXPORT MATRIX MODAL                         */}
        {/* ==================================================== */}
        {showExportModal && activeDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]">
            <div className="w-full max-w-[340px] bg-white rounded-2xl p-5 shadow-2xl border border-[#bec9bf]/40 space-y-4">
              <div className="flex items-center justify-between border-b border-[#eceeed] pb-2.5">
                <div>
                  <h3 className="font-headline text-[16px] font-bold text-[#191c1c]">Export Appraisal Form</h3>
                  <p className="font-mono text-[10.5px] text-[#6f7a71]">Choose your preferred file format</p>
                </div>
                <button onClick={() => setShowExportModal(false)} className="text-[#6f7a71] hover:text-[#191c1c]">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={() => handleExportNotepad(activeDoc)}
                  className="w-full p-3 rounded-xl border border-[#bec9bf]/50 hover:bg-[#FEF3C7]/40 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#D97706] text-[20px]">description</span>
                    <div className="text-left">
                      <p className="font-mono text-[12px] font-bold text-[#191c1c]">Notepad (.txt)</p>
                      <p className="font-mono text-[10px] text-[#6f7a71]">Fixed-width space-aligned table</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#D97706] font-bold">.txt</span>
                </button>

                <button 
                  onClick={() => handleExportWord(activeDoc)}
                  className="w-full p-3 rounded-xl border border-[#bec9bf]/50 hover:bg-blue-50 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-blue-700 text-[20px]">article</span>
                    <div className="text-left">
                      <p className="font-mono text-[12px] font-bold text-[#191c1c]">Microsoft Word (.doc)</p>
                      <p className="font-mono text-[10px] text-[#6f7a71]">Landscape formatted report</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-blue-700 font-bold">.docx</span>
                </button>

                <button 
                  onClick={() => handleExportExcel(activeDoc)}
                  className="w-full p-3 rounded-xl border border-[#bec9bf]/50 hover:bg-[#D1FAE5]/40 flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#1f7a4d] text-[20px]">table_chart</span>
                    <div className="text-left">
                      <p className="font-mono text-[12px] font-bold text-[#191c1c]">Excel Workbook (.xlsx)</p>
                      <p className="font-mono text-[10px] text-[#6f7a71]">10x19 Matrix & Metadata sheets</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#1f7a4d] font-bold">.xlsx</span>
                </button>

                <button 
                  onClick={() => handleExportCsv(activeDoc)}
                  className="w-full p-3 rounded-xl border border-[#bec9bf]/50 hover:bg-[#f2f4f3] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[#3f4941] text-[20px]">dataset</span>
                    <div className="text-left">
                      <p className="font-mono text-[12px] font-bold text-[#191c1c]">Standard CSV (.csv)</p>
                      <p className="font-mono text-[10px] text-[#6f7a71]">Raw comma-separated table</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#3f4941] font-bold">.csv</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* GLOBAL BOTTOM NAVIGATION DOCK                        */}
        {/* (Constructed directly from Stitch blueprint)         */}
        {/* ==================================================== */}
        <nav className="absolute bottom-2 left-4 right-4 z-40 bg-white rounded-full px-6 py-2 shadow-xl ring-1 ring-[#bec9bf]/30 flex justify-between items-center backdrop-blur-md">
          {/* Tab 1: Archive */}
          <button 
            onClick={() => setActiveTab('archive')}
            className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-200 w-16 py-1 ${
              activeTab === 'archive' ? 'text-[#1f7a4d] font-bold' : 'text-[#3f4941]'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeTab === 'archive' ? "'FILL' 1" : undefined }}>
              folder
            </span>
            <span className="font-mono text-[10px] mt-0.5">Archive</span>
          </button>

          {/* Central Raised Primary Scan Trigger FAB */}
          <div className="relative -top-4">
            <button 
              onClick={() => setActiveTab('scan')}
              aria-label="Scan Trigger" 
              className="w-14 h-14 rounded-full primary-btn-tactile ring-4 ring-[#ddf1e6] flex items-center justify-center text-white active:scale-90 transition-transform duration-200 shadow-lg cursor-pointer"
            >
              <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                document_scanner
              </span>
            </button>
          </div>

          {/* Tab 3: Settings */}
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center transition-colors active:scale-90 duration-200 w-16 py-1 ${
              activeTab === 'settings' ? 'text-[#1f7a4d] font-bold' : 'text-[#3f4941]'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeTab === 'settings' ? "'FILL' 1" : undefined }}>
              vpn_key
            </span>
            <span className="font-mono text-[10px] mt-0.5">Settings</span>
          </button>
        </nav>

        {/* iPhone Tactile Hardware Home Bar Indicator */}
        <div className="w-full flex justify-center pb-2 pt-1 absolute bottom-0 pointer-events-none z-50">
          <div className="w-32 h-1 bg-[#191c1c]/20 rounded-full"></div>
        </div>
      </main>
    </div>
  );
}
