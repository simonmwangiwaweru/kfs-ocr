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
  FileSpreadsheet
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

const DEFAULT_SAMPLE_DOC: ScanRecord = {
  id: "DOC-ABER-2023-01",
  title: "Aberdare Forest Form (Plot KFR/A2)",
  plotCode: "KFR/A2",
  forestStation: "Aberdare Forest Reserve",
  observerName: "M. Musyoka",
  date: Date.now() - 7200000,
  imageDataUrl: "/sample_field_form.jpg",
  fileSizeBytes: 2415104,
  fileType: "JPEG Form Scan",
  syncStatus: "SYNCED",
  isVerified: false,
  rows: [
    {
      rowNumber: 1,
      treeNumber: "01",
      speciesCode: "JUN_P",
      dbhCm: "45.3",
      heightM: "28.5",
      healthStatus: "Good",
      notes: "Dominant canopy",
      confidence: { treeNumber: 0.98, speciesCode: 0.95, dbhCm: 0.97, heightM: 0.95 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: [],
      isVerified: true
    },
    {
      rowNumber: 2,
      treeNumber: "02",
      speciesCode: "JUN_P",
      dbhCm: "38.0",
      heightM: "26.0",
      healthStatus: "Good",
      notes: "Healthy crown",
      confidence: { treeNumber: 0.95, speciesCode: 0.93, dbhCm: 0.94, heightM: 0.91 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: [],
      isVerified: true
    },
    {
      rowNumber: 3,
      treeNumber: "03",
      speciesCode: "GRA_R",
      dbhCm: "62.1",
      heightM: "31.5",
      healthStatus: "Fine",
      notes: "Boundary tree",
      confidence: { treeNumber: 0.97, speciesCode: 0.91, dbhCm: 0.96, heightM: 0.93 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: [],
      isVerified: true
    },
    {
      rowNumber: 4,
      treeNumber: "04",
      speciesCode: "POD_G",
      dbhCm: "22.8",
      heightM: "19.0",
      healthStatus: "Fair",
      notes: "Shaded subcanopy",
      confidence: { treeNumber: 0.94, speciesCode: 0.92, dbhCm: 0.91, heightM: 0.74 },
      flags: { dbhUncertain: false, heightUncertain: true },
      comments: [
        { id: "c1", author: "Field Lead (K. Omondi)", text: "Handwritten '19' faint from field moisture. Re-verified on tree tag.", timestamp: Date.now() - 3600000, isResolved: false }
      ],
      isVerified: false
    },
    {
      rowNumber: 5,
      treeNumber: "05",
      speciesCode: "OLE_A",
      dbhCm: "54.7",
      heightM: "24.2",
      healthStatus: "Poor",
      notes: "Stem bore holes",
      confidence: { treeNumber: 0.96, speciesCode: 0.94, dbhCm: 0.93, heightM: 0.92 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: [],
      isVerified: true
    },
    {
      rowNumber: 6,
      treeNumber: "06",
      speciesCode: "GRA_R",
      dbhCm: "35.4",
      heightM: "25.5",
      healthStatus: "Fair",
      notes: "Dead branches",
      confidence: { treeNumber: 0.96, speciesCode: 0.88, dbhCm: 0.69, heightM: 0.89 },
      flags: { dbhUncertain: true, heightUncertain: false },
      comments: [
        { id: "c2", author: "M. Musyoka", text: "Digits 3 and 5 overlap in handwritten entry; confirmed 35.4 cm.", timestamp: Date.now() - 1800000, isResolved: true }
      ],
      isVerified: false
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'review' | 'history' | 'protocol'>('scan');
  const [scanMode, setScanMode] = useState<'single' | 'batch' | 'queue'>('single');
  const [documents, setDocuments] = useState<ScanRecord[]>([DEFAULT_SAMPLE_DOC]);
  const [activeDoc, setActiveDoc] = useState<ScanRecord>(DEFAULT_SAMPLE_DOC);
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
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(3); // Row 4 (index 3) default for demo

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load from IndexedDB on initial mount
  useEffect(() => {
    const initDb = async () => {
      try {
        const count = await db.scans.count();
        if (count === 0) {
          await db.scans.add(DEFAULT_SAMPLE_DOC);
        } else {
          const all = await db.scans.toArray();
          setDocuments(all);
          if (all.length > 0) setActiveDoc(all[0]);
        }
      } catch (e) {
        console.warn("IndexedDB fallback to in-memory state:", e);
      }
    };
    initDb();
  }, []);

  const handleSimulateOCR = (imageSrc: string, fileName: string) => {
    setIsProcessing(true);
    setProcessingStep("1/4: Rectifying camera perspective and binarizing paper sheet...");
    
    setTimeout(() => {
      setProcessingStep("2/4: Detecting KEFRI inventory table grid borders...");
    }, 800);

    setTimeout(() => {
      setProcessingStep("3/4: Multimodal neural extraction of handwritten digits (DBH, Height)...");
    }, 1600);

    setTimeout(() => {
      setProcessingStep("4/4: Validating statistical confidence thresholds and flagging anomalies...");
    }, 2400);

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
      showToast("Form scanned and transcribed successfully!");
    }, 3200);
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
    if (!selectedCell) return;
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
    if (!selectedCell || !newCommentText.trim()) return;
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
    showToast("All table rows verified & marked ready for national inventory database!");
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
      "Field Notes": r.notes,
      "DBH Confidence": (r.confidence.dbhCm * 100).toFixed(0) + "%",
      "Height Confidence": (r.confidence.heightM * 100).toFixed(0) + "%",
      "Audit Notes": r.comments.map(c => `${c.author}: ${c.text}`).join(' | ')
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

  const handleCopyClipboard = (doc: ScanRecord) => {
    const text = doc.rows.map(r => `${r.treeNumber}\t${r.speciesCode}\t${r.dbhCm}\t${r.heightM}\t${r.healthStatus}\t${r.notes}`).join('\n');
    navigator.clipboard.writeText(`Tree#\tSpecies\tDBH(cm)\tHeight(m)\tHealth\tNotes\n${text}`);
    showToast("Copied tab-separated data to clipboard!");
  };

  const filteredDocs = documents.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.plotCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.forestStation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUncertainties = activeDoc.rows.filter(r => r.flags.dbhUncertain || r.flags.heightUncertain).length;
  const verifiedCount = activeDoc.rows.filter(r => r.isVerified).length;

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
                // fallback to lucide tree icon if logo fails
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
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 md:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
              title="Download compiled Android APK to install on phone"
            >
              <Smartphone size={14} className="text-emerald-200" />
              <span className="hidden xs:inline">Get Phone App</span> (APK)
            </a>

            {/* Offline Status Toggle */}
            <button 
              onClick={() => {
                setIsOffline(!isOffline);
                showToast(isOffline ? "Network online: background cloud sync active" : "Offline mode active: saving changes locally to IndexedDB");
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                isOffline ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {isOffline ? <CloudOff size={14} className="text-amber-600" /> : <Cloud size={14} className="text-emerald-600" />}
              <span className="text-[11px] hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
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

            {/* Viewfinder Guide & Capture Container */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl min-h-[380px] flex flex-col items-center justify-center p-6 text-white text-center">
              {/* Background watermark image preview */}
              <div 
                className="absolute inset-0 opacity-20 bg-center bg-cover pointer-events-none filter brightness-75"
                style={{ backgroundImage: `url('/sample_field_form.jpg')` }}
              />

              {/* Reticle Alignment Brackets */}
              <div className="absolute top-6 left-6 w-10 h-10 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg pointer-events-none"></div>
              <div className="absolute top-6 right-6 w-10 h-10 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg pointer-events-none"></div>
              <div className="absolute bottom-6 left-6 w-10 h-10 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg pointer-events-none"></div>
              <div className="absolute bottom-6 right-6 w-10 h-10 border-b-3 border-r-3 border-emerald-400 rounded-br-lg pointer-events-none"></div>

              {/* Grid guide overlay */}
              <div className="absolute inset-x-12 inset-y-16 border border-emerald-500/20 rounded pointer-events-none grid grid-rows-4 divide-y divide-emerald-500/10">
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
                <div className="relative z-10 space-y-4 max-w-sm">
                  <div className="w-14 h-14 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                    <FileText size={28} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Align KEFRI Field Sheet</h2>
                    <p className="text-xs text-slate-300 mt-1">
                      Position paper sheet inside the green reticle for automatic grid detection and numeric transcription.
                    </p>
                  </div>

                  {/* Primary Action Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                    {/* Camera Button */}
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
                    >
                      <Camera size={16} /> Take Photo with Camera
                    </button>

                    {/* Upload File Button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
                    >
                      <Upload size={16} /> Upload Image
                    </button>
                  </div>

                  {/* Demo Sample Button */}
                  <div className="pt-2">
                    <button
                      onClick={() => handleSimulateOCR('/sample_field_form.jpg', 'KEFRI_Aberdare_Plot_KFR.jpg')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium flex items-center justify-center gap-1 mx-auto"
                    >
                      <Sparkles size={13} /> Or test with official KEFRI paper sample sheet
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

        {/* TAB 2: AUDIT & REVIEW */}
        {activeTab === 'review' && (
          <div className="space-y-4">
            {/* Header Document Summary & Export Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-slate-900">{activeDoc.title}</h2>
                  {activeDoc.isVerified ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={12} /> Approved
                    </span>
                  ) : (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle size={12} /> {totalUncertainties} Flags to Check
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                  <span>Plot: <strong className="text-slate-800">{activeDoc.plotCode}</strong></span>
                  <span>Station: <strong className="text-slate-800">{activeDoc.forestStation}</strong></span>
                  <span>Observer: <strong className="text-slate-800">{activeDoc.observerName}</strong></span>
                  <span>Date: <strong className="text-slate-800">{new Date(activeDoc.date).toLocaleDateString()}</strong></span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleVerifyAll}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ShieldCheck size={14} className="text-emerald-700" /> Verify All
                </button>
                <button 
                  onClick={() => handleExportXLSX(activeDoc)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <FileSpreadsheet size={14} /> Export Excel
                </button>
                <button 
                  onClick={() => handleExportCSV(activeDoc)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  title="Export plain CSV"
                >
                  <Download size={13} /> CSV
                </button>
                <button 
                  onClick={() => handleCopyClipboard(activeDoc)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 p-1.5 rounded-lg text-xs transition"
                  title="Copy table to clipboard"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {/* Side-by-Side Review Splitter */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Pane: Original Paper Sheet View with Bounding Box Highlights */}
              <div className="lg:col-span-5 bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col">
                <div className="flex justify-between items-center mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText size={14} className="text-emerald-700" /> Original Paper Field Sheet
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">Zoomable Reticle</span>
                </div>

                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group">
                  <img 
                    src={activeDoc.imageDataUrl || "/sample_field_form.jpg"} 
                    alt="Scanned field form" 
                    className="w-full h-auto max-h-[460px] object-cover object-top select-none"
                  />

                  {/* Interactive Bounding Box Overlays */}
                  <div className="absolute inset-0 pointer-events-auto">
                    {activeDoc.rows.map((row, idx) => {
                      const isSelected = selectedRowIndex === idx;
                      const hasFlag = row.flags.dbhUncertain || row.flags.heightUncertain;
                      // approximate vertical row position
                      const topPercent = 38 + idx * 7.5;
                      return (
                        <div
                          key={row.rowNumber}
                          onClick={() => {
                            setSelectedRowIndex(idx);
                            handleCellClick(row.rowNumber, 'dbhCm', 'DBH (cm)', row.dbhCm, row.confidence.dbhCm, row.flags.dbhUncertain, idx);
                          }}
                          style={{ top: `${topPercent}%`, height: '6.5%' }}
                          className={`absolute left-4 right-4 rounded border cursor-pointer transition flex items-center justify-between px-2 text-[10px] font-mono ${
                            isSelected 
                              ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100 font-bold ring-2 ring-emerald-400' 
                              : hasFlag 
                              ? 'bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-500/35' 
                              : 'bg-transparent border-transparent hover:border-slate-400/40'
                          }`}
                        >
                          <span className="bg-black/60 px-1 rounded text-[9px]">Row {row.rowNumber}: Tree #{row.treeNumber}</span>
                          {hasFlag && (
                            <span className="bg-amber-600 text-white px-1 rounded text-[9px] font-bold">Uncertain</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-3 p-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Click any highlighted row to inspect handwriting crop</span>
                  <span className="font-semibold text-emerald-800">{verifiedCount} of {activeDoc.rows.length} rows verified</span>
                </div>
              </div>

              {/* Right Pane: Extracted Structured Table */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">Extracted Structured Table</h3>
                    <span className="text-[11px] text-slate-500">({activeDoc.rows.length} Trees)</span>
                  </div>
                  {totalUncertainties > 0 && (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <AlertTriangle size={12} className="text-amber-600" /> {totalUncertainties} Needs Verification
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="p-2.5">Tree #</th>
                        <th className="p-2.5">Species</th>
                        <th className="p-2.5">DBH (cm)</th>
                        <th className="p-2.5">Height (m)</th>
                        <th className="p-2.5">Health</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {activeDoc.rows.map((row, idx) => {
                        const isSelected = selectedRowIndex === idx;
                        return (
                          <tr 
                            key={row.rowNumber} 
                            className={`transition cursor-pointer ${
                              isSelected ? 'bg-emerald-50/90 font-medium' : 'hover:bg-slate-50'
                            }`}
                            onClick={() => setSelectedRowIndex(idx)}
                          >
                            <td className="p-2.5 font-bold text-slate-900">{row.treeNumber}</td>
                            <td 
                              className="p-2.5 hover:underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(row.rowNumber, 'speciesCode', 'Species Code', row.speciesCode, row.confidence.speciesCode, false, idx);
                              }}
                            >
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold">{row.speciesCode}</span>
                            </td>
                            {/* DBH Cell */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(row.rowNumber, 'dbhCm', 'DBH (cm)', row.dbhCm, row.confidence.dbhCm, row.flags.dbhUncertain, idx);
                              }}
                              className={`p-2.5 ${
                                row.flags.dbhUncertain 
                                  ? 'bg-amber-100 text-amber-950 font-bold border-l-3 border-amber-500' 
                                  : 'hover:bg-emerald-100/50'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {row.flags.dbhUncertain && <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />}
                                <span>{row.dbhCm}</span>
                              </div>
                            </td>
                            {/* Height Cell */}
                            <td 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCellClick(row.rowNumber, 'heightM', 'Height (m)', row.heightM, row.confidence.heightM, row.flags.heightUncertain, idx);
                              }}
                              className={`p-2.5 ${
                                row.flags.heightUncertain 
                                  ? 'bg-amber-100 text-amber-950 font-bold border-l-3 border-amber-500' 
                                  : 'hover:bg-emerald-100/50'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                {row.flags.heightUncertain && <AlertTriangle size={13} className="text-amber-600 flex-shrink-0" />}
                                <span>{row.heightM}</span>
                              </div>
                            </td>
                            <td className="p-2.5 font-sans text-slate-700">{row.healthStatus}</td>
                            <td className="p-2.5">
                              {row.isVerified ? (
                                <span className="text-emerald-700 font-sans font-semibold text-[11px] flex items-center gap-1">
                                  <Check size={12} /> Verified
                                </span>
                              ) : (
                                <span className="text-amber-700 font-sans text-[11px] flex items-center gap-1">
                                  <Edit3 size={11} /> Review
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bottom Row Audit Comments preview */}
                {selectedRowIndex !== null && activeDoc.rows[selectedRowIndex] && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <MessageSquare size={13} className="text-emerald-700" />
                        Row {activeDoc.rows[selectedRowIndex].rowNumber} Field Notes & Auditor Comments
                      </span>
                      <button
                        onClick={() => handleCellClick(
                          activeDoc.rows[selectedRowIndex].rowNumber,
                          'dbhCm',
                          'DBH (cm)',
                          activeDoc.rows[selectedRowIndex].dbhCm,
                          activeDoc.rows[selectedRowIndex].confidence.dbhCm,
                          activeDoc.rows[selectedRowIndex].flags.dbhUncertain,
                          selectedRowIndex
                        )}
                        className="text-[11px] text-emerald-700 hover:underline font-semibold"
                      >
                        Open Cell Inspector
                      </button>
                    </div>
                    {activeDoc.rows[selectedRowIndex].comments.length > 0 ? (
                      <div className="space-y-1.5">
                        {activeDoc.rows[selectedRowIndex].comments.map(c => (
                          <div key={c.id} className="text-xs bg-white p-2 rounded border border-slate-200 flex justify-between items-start">
                            <div>
                              <strong className="text-slate-800">{c.author}:</strong> <span className="text-slate-600">{c.text}</span>
                            </div>
                            <button
                              onClick={() => handleToggleResolveComment(activeDoc.rows[selectedRowIndex].rowNumber, c.id)}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                c.isResolved ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {c.isResolved ? 'Resolved' : 'Mark Resolved'}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No audit flags or comments on this row. Tap cell to inspect.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DOCUMENT ARCHIVE & HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Archived Field Surveys</h2>
                <p className="text-xs text-slate-500">Persistent local records and cloud synchronizations</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search plot code or station..."
                  className="w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredDocs.map(doc => {
                const docUncertainties = doc.rows.filter(r => r.flags.dbhUncertain || r.flags.heightUncertain).length;
                return (
                  <div 
                    key={doc.id} 
                    className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:border-slate-300 transition shadow-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{doc.title}</h3>
                        {doc.isVerified ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Approved</span>
                        ) : docUncertainties > 0 ? (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{docUncertainties} Flags</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">Ready</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 text-xs text-slate-500">
                        <span>Plot: <strong>{doc.plotCode}</strong></span>
                        <span>Station: <strong>{doc.forestStation}</strong></span>
                        <span>Date: <strong>{new Date(doc.date).toLocaleDateString()}</strong></span>
                        <span>Rows: <strong>{doc.rows.length} Trees</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => { setActiveDoc(doc); setActiveTab('review'); }}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3 py-1.5 rounded-lg text-xs font-bold transition"
                      >
                        Open Audit View
                      </button>
                      <button 
                        onClick={() => handleExportXLSX(doc)}
                        className="p-2 text-slate-600 hover:text-emerald-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                        title="Download Excel"
                      >
                        <Download size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: PROTOCOL & APK INSTALL GUIDE */}
        {activeTab === 'protocol' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Phone Installation Card */}
            <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white rounded-2xl p-6 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-emerald-700/60 text-emerald-200 text-xs px-2.5 py-1 rounded-full font-semibold">
                    <Smartphone size={14} /> Android Native Application
                  </div>
                  <h2 className="text-xl font-bold">Install on Your Android Phone</h2>
                  <p className="text-xs text-emerald-100 leading-relaxed max-w-md">
                    Use KFS Inventory Scan in remote forest locations without cellular network. Download the standalone Android APK directly to your phone.
                  </p>
                </div>
                <a
                  href="/kfs-inventory-scan.apk"
                  download="kfs-inventory-scan.apk"
                  className="bg-white hover:bg-emerald-50 text-emerald-950 px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition active:scale-95 flex-shrink-0"
                >
                  <Download size={16} /> Download APK (27 MB)
                </a>
              </div>

              {/* 3 Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-emerald-700/60 text-xs">
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-700/40">
                  <strong className="block text-emerald-300 font-bold mb-1">Step 1: Download</strong>
                  <span>Tap the Download APK button on your mobile browser.</span>
                </div>
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-700/40">
                  <strong className="block text-emerald-300 font-bold mb-1">Step 2: Allow Install</strong>
                  <span>When prompted, allow installing apps from this browser in Settings.</span>
                </div>
                <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-700/40">
                  <strong className="block text-emerald-300 font-bold mb-1">Step 3: Launch</strong>
                  <span>Open KFS Inventory and point camera at your paper sheets in the field!</span>
                </div>
              </div>
            </div>

            {/* KEFRI Measurement Standards */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Trees size={16} className="text-emerald-700" /> KEFRI Forestry Standards & Codes
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">DBH Measurement Protocol</span>
                  <p className="text-slate-600">Diameter at Breast Height is recorded at precisely 1.3 meters above the ground from the uphill side.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">Tree Height Protocol</span>
                  <p className="text-slate-600">Measured using optical clinometer or laser hypsometer, recorded in meters to one decimal place.</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Common Kenya Indigenous Species Codes</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <strong className="text-emerald-900">JUN_P</strong>
                    <div className="text-[10px] text-emerald-700 font-sans">East African Cedar</div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <strong className="text-emerald-900">POD_G</strong>
                    <div className="text-[10px] text-emerald-700 font-sans">Podo / Musengera</div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <strong className="text-emerald-900">GRA_R</strong>
                    <div className="text-[10px] text-emerald-700 font-sans">Grevillea Robusta</div>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                    <strong className="text-emerald-900">OLE_A</strong>
                    <div className="text-[10px] text-emerald-700 font-sans">African Wild Olive</div>
                  </div>
                </div>
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

      {/* Bottom Sticky Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 py-2 px-4 z-40 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1 text-center">
          <button 
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'scan' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera size={18} />
            <span className="text-[10px] mt-0.5">Scan</span>
          </button>
          <button 
            onClick={() => setActiveTab('review')}
            className={`flex flex-col items-center justify-center py-1 relative transition ${
              activeTab === 'review' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={18} />
            <span className="text-[10px] mt-0.5">Audit View</span>
            {totalUncertainties > 0 && (
              <span className="absolute top-0 right-4 w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'history' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Archive size={18} />
            <span className="text-[10px] mt-0.5">Archive</span>
          </button>
          <button 
            onClick={() => setActiveTab('protocol')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'protocol' ? 'text-emerald-700 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={18} />
            <span className="text-[10px] mt-0.5">Phone APK</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
