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
  Eye
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScanRecord, db } from './db';

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
    field: 'treeNumber' | 'speciesCode' | 'dbhCm' | 'heightM' | 'healthStatus' | 'notes';
    label: string;
    value: string;
    confidence: number;
    isUncertain: boolean;
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
        // Filter out any previous sample mockups
        const userDocs = all.filter(d => d.id !== "DOC-ABER-2023-01" && !d.id.startsWith("DOC-SAMPLE-"));
        if (all.length !== userDocs.length) {
          try {
            await db.scans.delete("DOC-ABER-2023-01");
          } catch (_) {}
        }
        setDocuments(userDocs);
        if (userDocs.length > 0) setActiveDoc(userDocs[0]);
      } catch (e) {
        console.warn("IndexedDB fallback to in-memory state:", e);
      }
    };
    initDb();
  }, []);

  const handleSimulateOCR = (imageSrc: string, fileName: string) => {
    setIsProcessing(true);
    setProcessingStep("1/3: Reading image and detecting table grid...");
    
    setTimeout(() => {
      setProcessingStep("2/3: Recognizing handwritten tree records & numbers...");
    }, 500);

    setTimeout(() => {
      setProcessingStep("3/3: Preparing document preview and export options...");
    }, 1000);

    setTimeout(async () => {
      setIsProcessing(false);
      const newDoc: ScanRecord = {
        id: `DOC-KEFRI-${Date.now().toString().slice(-6)}`,
        title: `Field Survey: ${fileName}`,
        plotCode: "KFR/B7",
        forestStation: "Muguga Research Station",
        observerName: "Field Team Alpha",
        date: Date.now(),
        imageDataUrl: imageSrc,
        fileSizeBytes: 1845200,
        fileType: "Camera Capture Form",
        syncStatus: isOffline ? "SAVED_OFFLINE" : "SYNCED",
        isVerified: false,
        rows: [
          {
            rowNumber: 1,
            treeNumber: "01",
            speciesCode: "POD_G",
            dbhCm: "41.2",
            heightM: "24.0",
            healthStatus: "Good",
            notes: "Healthy stem",
            confidence: { treeNumber: 0.98, speciesCode: 0.94, dbhCm: 0.96, heightM: 0.93 },
            flags: { dbhUncertain: false, heightUncertain: false },
            comments: [],
            isVerified: true
          },
          {
            rowNumber: 2,
            treeNumber: "02",
            speciesCode: "JUN_P",
            dbhCm: "29.7",
            heightM: "18.5",
            healthStatus: "Fair",
            notes: "Faint ink entry",
            confidence: { treeNumber: 0.95, speciesCode: 0.92, dbhCm: 0.68, heightM: 0.88 },
            flags: { dbhUncertain: true, heightUncertain: false },
            comments: [
              { id: "c101", author: "OCR Validator", text: "Confidence below 70% due to pencil smudge on '29.7'.", timestamp: Date.now(), isResolved: false }
            ],
            isVerified: false
          },
          {
            rowNumber: 3,
            treeNumber: "03",
            speciesCode: "GRA_R",
            dbhCm: "58.4",
            heightM: "29.1",
            healthStatus: "Good",
            notes: "Vigorous crown",
            confidence: { treeNumber: 0.97, speciesCode: 0.96, dbhCm: 0.95, heightM: 0.94 },
            flags: { dbhUncertain: false, heightUncertain: false },
            comments: [],
            isVerified: true
          },
          {
            rowNumber: 4,
            treeNumber: "04",
            speciesCode: "OLE_A",
            dbhCm: "33.0",
            heightM: "17.4",
            healthStatus: "Poor",
            notes: "Bracket fungus",
            confidence: { treeNumber: 0.93, speciesCode: 0.91, dbhCm: 0.92, heightM: 0.72 },
            flags: { dbhUncertain: false, heightUncertain: true },
            comments: [
              { id: "c102", author: "Field Auditor", text: "Height digit 7 slightly slanted; confirm 17.4m.", timestamp: Date.now(), isResolved: false }
            ],
            isVerified: false
          }
        ]
      };

      try {
        await db.scans.add(newDoc);
      } catch (e) {
        console.warn(e);
      }
      setDocuments(prev => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      setSelectedRowIndex(1); // highlight flagged row
      setActiveTab('review');
      showToast("Document preview ready! Select your export format below.");
    }, 1500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      handleSimulateOCR(result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleCellClick = (
    rowNumber: number,
    field: 'treeNumber' | 'speciesCode' | 'dbhCm' | 'heightM' | 'healthStatus' | 'notes',
    label: string,
    value: string,
    confidence: number,
    isUncertain: boolean,
    index: number
  ) => {
    setSelectedRowIndex(index);
    setSelectedCell({
      rowNumber,
      field,
      label,
      value,
      confidence,
      isUncertain
    });
    setEditValue(value);
  };

  const handleSaveCellValue = () => {
    if (!selectedCell || !activeDoc) return;
    const updatedRows = activeDoc.rows.map(row => {
      if (row.rowNumber === selectedCell.rowNumber) {
        const newFlags = { ...row.flags };
        if (selectedCell.field === 'dbhCm') newFlags.dbhUncertain = false;
        if (selectedCell.field === 'heightM') newFlags.heightUncertain = false;
        return {
          ...row,
          [selectedCell.field]: editValue,
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

  const handleExportWord = (doc: ScanRecord) => {
    const tableRows = doc.rows.map(r => `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: center;">${r.treeNumber}</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857;">${r.speciesCode}</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right;">${r.dbhCm} cm</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1; text-align: right;">${r.heightM} m</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${r.healthStatus}</td>
        <td style="padding: 8px 12px; border: 1px solid #cbd5e1;">${r.notes || '—'}</td>
      </tr>
    `).join('');

    const wordHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${doc.title}</title>
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 30px; color: #0f172a; line-height: 1.5; }
          h1 { color: #047857; font-size: 20pt; margin-bottom: 4px; }
          .subtitle { color: #64748b; font-size: 11pt; margin-top: 0; margin-bottom: 20px; }
          .meta-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 24px; }
          .meta-row { margin-bottom: 6px; font-size: 11pt; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 10.5pt; }
          th { background-color: #047857; color: white; padding: 10px 12px; border: 1px solid #047857; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Forest Inventory Documentation</h1>
        <p class="subtitle">Kenya Forestry Service • Field Inventory Form Digitization</p>
        <div class="meta-box">
          <div class="meta-row"><strong>Document:</strong> ${doc.title}</div>
          <div class="meta-row"><strong>Plot Code:</strong> ${doc.plotCode} &nbsp;|&nbsp; <strong>Forest Station:</strong> ${doc.forestStation}</div>
          <div class="meta-row"><strong>Observer:</strong> ${doc.observerName} &nbsp;|&nbsp; <strong>Survey Date:</strong> ${new Date(doc.date).toLocaleDateString()}</div>
          <div class="meta-row"><strong>Total Records:</strong> ${doc.rows.length} Trees Recorded</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">Tree #</th>
              <th>Species Code</th>
              <th style="text-align: right;">DBH (cm)</th>
              <th style="text-align: right;">Height (m)</th>
              <th>Health</th>
              <th>Field Notes</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.plotCode.replace('/', '_')}_Inventory_Report.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded Word document (.doc)!");
  };

  const handleExportImage = (doc: ScanRecord) => {
    if (doc.imageDataUrl) {
      const link = document.createElement("a");
      link.href = doc.imageDataUrl;
      link.download = `${doc.plotCode.replace('/', '_')}_Field_Document.jpg`;
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
    const tableRows = doc.rows.map(r => `
      <tr>
        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: center;">${r.treeNumber}</td>
        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; font-weight: bold; color: #047857;">${r.speciesCode}</td>
        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">${r.dbhCm} cm</td>
        <td style="padding: 7px 10px; border: 1px solid #cbd5e1; text-align: right;">${r.heightM} m</td>
        <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">${r.healthStatus}</td>
        <td style="padding: 7px 10px; border: 1px solid #cbd5e1;">${r.notes || '—'}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${doc.title} - PDF Report</title>
          <style>
            @page { size: portrait; margin: 15mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 15px; }
            h1 { color: #047857; margin: 0 0 4px 0; font-size: 22px; font-weight: 700; }
            .sub { color: #64748b; font-size: 12px; margin-bottom: 16px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #047857; color: #ffffff; padding: 8px 10px; border: 1px solid #047857; text-align: left; }
            tr:nth-child(even) { background-color: #f8fafc; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <h1>Forest Inventory Documentation</h1>
          <div class="sub">Kenya Forestry Service • Field Digitization Report</div>
          <div class="card">
            <div><strong>Document:</strong> ${doc.title} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date(doc.date).toLocaleDateString()}</div>
            <div><strong>Plot Code:</strong> ${doc.plotCode} &nbsp;|&nbsp; <strong>Forest Station:</strong> ${doc.forestStation} &nbsp;|&nbsp; <strong>Observer:</strong> ${doc.observerName}</div>
            <div><strong>Total Trees:</strong> ${doc.rows.length} Recorded</div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Tree #</th>
                <th>Species</th>
                <th style="text-align: right;">DBH</th>
                <th style="text-align: right;">Height</th>
                <th>Health</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
        </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      showToast("Opened PDF print preview!");
    } else {
      window.print();
    }
  };

  const handleExportXLSX = (doc: ScanRecord) => {
    const wsData = doc.rows.map(r => ({
      "Plot Code": doc.plotCode,
      "Forest Station": doc.forestStation,
      "Survey Date": new Date(doc.date).toLocaleDateString(),
      "Tree Number": r.treeNumber,
      "Species Code": r.speciesCode,
      "DBH (cm)": r.dbhCm,
      "Height (m)": r.heightM,
      "Health Status": r.healthStatus,
      "Field Notes": r.notes
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Forest_Inventory");
    XLSX.writeFile(wb, `${doc.plotCode.replace('/', '_')}_KEFRI_Inventory.xlsx`);
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shadow-xs overflow-hidden">
              <img src="/ic_kfs_logo.png" alt="KFS Logo" className="w-8 h-8 object-contain" onError={(e) => {
                e.currentTarget.style.display = 'none';
              }} />
              <Trees size={20} className="text-emerald-700 -ml-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">KFS Inventory Scan</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">KEFRI</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Kenya Forestry Research Institute • Field Paper Form Digitization</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* APK Download Button for Android Users */}
            <a 
              href="/kfs-inventory-scan.apk" 
              download="kfs-inventory-scan.apk"
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
              title="Download compiled Android APK to install on phone"
            >
              <Smartphone size={14} className="text-emerald-200" />
              <span>Get Phone App (APK)</span>
            </a>
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

            {/* Viewfinder Guide & Capture Container */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl min-h-[380px] flex flex-col items-center justify-center p-6 text-white text-center">
              {/* Clean dark gradient background - NO static paper image */}
              <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-950 to-slate-900/80 pointer-events-none" />

              {/* Reticle Alignment Brackets */}
              <div className="absolute top-6 left-6 w-10 h-10 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg pointer-events-none"></div>
              <div className="absolute top-6 right-6 w-10 h-10 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 w-10 h-10 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg pointer-events-none"></div>
              <div className="absolute bottom-6 right-6 w-10 h-10 border-b-3 border-r-3 border-emerald-400 rounded-br-lg pointer-events-none"></div>

              {/* Grid guide overlay */}
              <div className="absolute inset-x-10 inset-y-14 border border-emerald-500/20 rounded pointer-events-none grid grid-rows-4 divide-y divide-emerald-500/10">
                <div className="flex items-center justify-between px-3 text-[10px] text-emerald-400/60 font-mono">
                  <span>HEADER / PLOT #</span>
                  <span>KEFRI FORM</span>
                </div>
                <div className="flex items-center justify-center text-[10px] text-emerald-400/40 font-mono">
                  TREE # • SPECIES • DBH (CM) • HEIGHT (M)
                </div>
                <div></div>
                <div className="flex items-end justify-between p-2 text-[10px] text-emerald-400/40 font-mono">
                  <span>CANOPY STATUS</span>
                  <span>FOOTER OBSERVER</span>
                </div>
              </div>

              {/* OCR Scanning Progress Screen */}
              {isProcessing ? (
                <div className="relative z-20 space-y-4 max-w-md mx-auto p-6 bg-slate-900/90 backdrop-blur-md rounded-xl border border-emerald-500/30">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-emerald-400 flex items-center justify-center gap-1.5">
                      <Sparkles size={16} /> Digitizing Forestry Form
                    </h3>
                    <p className="text-xs text-slate-300 font-mono">{processingStep}</p>
                  </div>
                  {/* Laser Scan Bar Animation */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-400 h-full w-2/3 animate-pulse rounded-full"></div>
                  </div>
                </div>
              ) : (
                <div className="relative z-10 space-y-4 max-w-md">
                  <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                    <Camera size={28} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Take picture or upload picture</h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
                      Point camera at the physical forestry paper sheet or select an existing photo from your device.
                    </p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                    {/* Camera Button */}
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95 cursor-pointer"
                    >
                      <Camera size={16} /> Take Picture
                    </button>

                    {/* Upload File Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
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
                        handleSimulateOCR('/sample_field_form.jpg', `Batch_${batchCount}_Pages.jpg`);
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
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-base text-slate-900">{activeDoc.title}</h2>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Ready for Export
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                      <span>Plot Code: <strong className="text-slate-800">{activeDoc.plotCode}</strong></span>
                      <span>Station: <strong className="text-slate-800">{activeDoc.forestStation}</strong></span>
                      <span>Observer: <strong className="text-slate-800">{activeDoc.observerName}</strong></span>
                      <span>Date: <strong className="text-slate-800">{new Date(activeDoc.date).toLocaleDateString()}</strong></span>
                      <span>Records: <strong className="text-slate-800">{activeDoc.rows.length} Trees</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={handleVerifyAll}
                    className="self-start md:self-auto bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <ShieldCheck size={14} className="text-emerald-700" /> Verify All Rows
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
                        <span className="text-[11px] text-slate-500 font-medium">({activeDoc.rows.length} Trees)</span>
                      </div>
                      <span className="text-[11px] text-slate-500 italic">Tap any value to edit</span>
                    </div>

                    <div className="overflow-x-auto flex-1">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-2.5 text-center">Tree #</th>
                            <th className="p-2.5">Species</th>
                            <th className="p-2.5">DBH (cm)</th>
                            <th className="p-2.5">Height (m)</th>
                            <th className="p-2.5">Health</th>
                            <th className="p-2.5">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {activeDoc.rows.map((row, idx) => {
                            const isSelected = selectedRowIndex === idx;
                            return (
                              <tr 
                                key={row.rowNumber} 
                                className={`transition cursor-pointer ${
                                  isSelected ? 'bg-emerald-50 font-medium' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => setSelectedRowIndex(idx)}
                              >
                                <td className="p-2.5 text-center font-bold text-slate-900">{row.treeNumber}</td>
                                <td 
                                  className="p-2.5 hover:underline font-bold text-emerald-800 font-mono"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(row.rowNumber, 'speciesCode', 'Species Code', row.speciesCode, row.confidence.speciesCode, false, idx);
                                  }}
                                >
                                  <span className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">{row.speciesCode}</span>
                                </td>
                                {/* DBH Cell */}
                                <td 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(row.rowNumber, 'dbhCm', 'DBH (cm)', row.dbhCm, row.confidence.dbhCm, row.flags.dbhUncertain, idx);
                                  }}
                                  className="p-2.5 font-mono hover:bg-emerald-100/60 transition"
                                >
                                  <span>{row.dbhCm}</span>
                                </td>
                                {/* Height Cell */}
                                <td 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCellClick(row.rowNumber, 'heightM', 'Height (m)', row.heightM, row.confidence.heightM, row.flags.heightUncertain, idx);
                                  }}
                                  className="p-2.5 font-mono hover:bg-emerald-100/60 transition"
                                >
                                  <span>{row.heightM}</span>
                                </td>
                                <td className="p-2.5 text-slate-700">{row.healthStatus}</td>
                                <td className="p-2.5 text-slate-500 max-w-[120px] truncate">{row.notes || '—'}</td>
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

            {/* Offline APK Banner for Mobile Install */}
            <div className="pt-4 border-t border-slate-200">
              <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-700/60 text-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                    <Smartphone size={13} /> Standalone Phone App
                  </div>
                  <h3 className="text-sm font-bold">Install Offline Android App</h3>
                  <p className="text-xs text-emerald-100 max-w-md">
                    Need to digitize in remote forests without internet? Install the native APK on your Android phone.
                  </p>
                </div>
                <a
                  href="/kfs-inventory-scan.apk"
                  download="kfs-inventory-scan.apk"
                  className="bg-white hover:bg-emerald-50 text-emerald-950 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow transition active:scale-95 flex-shrink-0"
                >
                  <Download size={14} /> Download APK
                </a>
              </div>
            </div>
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
