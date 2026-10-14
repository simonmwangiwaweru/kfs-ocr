import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ScanRecord } from './db';

const initialDemoDoc: ScanRecord = {
  id: "DOC-ABER-2023-01",
  title: "Aberdare Forest Form (Plot KFR/A2)",
  plotCode: "KFR/A2",
  forestStation: "Aberdare Forest Reserve",
  observerName: "M. Musyoka",
  date: Date.now() - 7200000,
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
      notes: "",
      confidence: { treeNumber: 0.98, speciesCode: 0.95, dbhCm: 0.97, heightM: 0.95 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: []
    },
    {
      rowNumber: 2,
      treeNumber: "02",
      speciesCode: "JUN_P",
      dbhCm: "38.0",
      heightM: "26.0",
      healthStatus: "Good",
      notes: "",
      confidence: { treeNumber: 0.95, speciesCode: 0.93, dbhCm: 0.94, heightM: 0.91 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: []
    },
    {
      rowNumber: 3,
      treeNumber: "03",
      speciesCode: "GRA_R",
      dbhCm: "62.1",
      heightM: "31.5",
      healthStatus: "Fine",
      notes: "",
      confidence: { treeNumber: 0.97, speciesCode: 0.91, dbhCm: 0.96, heightM: 0.93 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: []
    },
    {
      rowNumber: 4,
      treeNumber: "04",
      speciesCode: "POD_G",
      dbhCm: "22.8",
      heightM: "19.0",
      healthStatus: "Fair",
      notes: "",
      confidence: { treeNumber: 0.94, speciesCode: 0.92, dbhCm: 0.91, heightM: 0.74 },
      flags: { dbhUncertain: false, heightUncertain: true },
      comments: [{ id: "c1", author: "Field Lead", text: "Handwritten 19 faint from moisture", timestamp: Date.now() - 3600000, isResolved: false }]
    },
    {
      rowNumber: 5,
      treeNumber: "05",
      speciesCode: "OLE_A",
      dbhCm: "54.7",
      heightM: "24.2",
      healthStatus: "Poor",
      notes: "",
      confidence: { treeNumber: 0.96, speciesCode: 0.94, dbhCm: 0.93, heightM: 0.92 },
      flags: { dbhUncertain: false, heightUncertain: false },
      comments: []
    },
    {
      rowNumber: 7,
      treeNumber: "07",
      speciesCode: "GRA_R",
      dbhCm: "35.4",
      heightM: "25.5",
      healthStatus: "Fair",
      notes: "Dead branches",
      confidence: { treeNumber: 0.96, speciesCode: 0.88, dbhCm: 0.69, heightM: 0.89 },
      flags: { dbhUncertain: true, heightUncertain: false },
      comments: [{ id: "c2", author: "M. Musyoka", text: "Digits 3 and 5 overlap; confirmed 35.4cm on re-check", timestamp: Date.now() - 1800000, isResolved: true }]
    }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'review' | 'history' | 'protocol'>('scan');
  const [scanMode, setScanMode] = useState<'single' | 'batch' | 'queue'>('single');
  const [documents] = useState<ScanRecord[]>([initialDemoDoc]);
  const [activeDoc, setActiveDoc] = useState<ScanRecord>(initialDemoDoc);
  const [isOffline, setIsOffline] = useState(false);
  const [batchCount, setBatchCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [, setSelectedCell] = useState<any>(null);

  const handleExportXLSX = (doc: ScanRecord) => {
    const wsData = doc.rows.map(r => ({
      "Tree Number": r.treeNumber,
      "Species Code": r.speciesCode,
      "DBH (cm)": r.dbhCm,
      "Height (m)": r.heightM,
      "Health": r.healthStatus,
      "Notes": r.notes,
      "DBH Confidence": (r.confidence.dbhCm * 100).toFixed(0) + "%",
      "Height Confidence": (r.confidence.heightM * 100).toFixed(0) + "%",
      "Comments": r.comments.map(c => `${c.author}: ${c.text}`).join('; ')
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory_Data");
    XLSX.writeFile(wb, `${doc.plotCode}_inventory_export.xlsx`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] font-sans antialiased text-[#0F172A]">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Trees size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">KFS Inventory Scan</h1>
            <p className="text-xs text-slate-500">Kenya Forestry Research Institute (KEFRI) • Field Digitization</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition ${
              isOffline ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            {isOffline ? <CloudOff size={13} /> : <Cloud size={13} />}
            {isOffline ? 'Offline' : 'Synced'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 pb-24">
        {activeTab === 'scan' && (
          <div className="space-y-6">
            {/* Segmented Pill Mode Selector */}
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 grid grid-cols-3 gap-1">
              <button 
                onClick={() => setScanMode('single')}
                className={`py-2 px-3 rounded-lg text-center transition flex flex-col items-center justify-center ${
                  scanMode === 'single' ? 'bg-white shadow-sm font-semibold text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Camera size={14} className={scanMode === 'single' ? 'text-emerald-600' : 'text-slate-500'} />
                  Single Page
                </div>
                <div className="text-[10px] text-slate-400 font-normal">Instant OCR</div>
              </button>
              <button 
                onClick={() => setScanMode('batch')}
                className={`py-2 px-3 rounded-lg text-center transition flex flex-col items-center justify-center ${
                  scanMode === 'batch' ? 'bg-white shadow-sm font-semibold text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers size={14} className={scanMode === 'batch' ? 'text-emerald-600' : 'text-slate-500'} />
                  Batch Mode
                </div>
                <div className="text-[10px] text-slate-400 font-normal">{batchCount} Queued</div>
              </button>
              <button 
                onClick={() => { setScanMode('queue'); setActiveTab('history'); }}
                className={`py-2 px-3 rounded-lg text-center transition flex flex-col items-center justify-center ${
                  scanMode === 'queue' ? 'bg-white shadow-sm font-semibold text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="text-xs font-semibold flex items-center gap-1.5">
                  <Archive size={14} className={scanMode === 'queue' ? 'text-emerald-600' : 'text-slate-500'} />
                  Offline Tray
                </div>
                <div className="text-[10px] text-slate-400 font-normal">{isOffline ? 'Active' : 'Synced'}</div>
              </button>
            </div>

            {/* Viewfinder Guide */}
            <div className="relative bg-slate-900 rounded-2xl h-80 overflow-hidden flex items-center justify-center text-white border border-slate-800 shadow-lg">
              <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl"></div>
              <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr"></div>
              <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl"></div>
              <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br"></div>

              <div className="text-center space-y-2 z-10 px-4">
                <FileText className="mx-auto text-emerald-400" size={32} />
                <p className="text-sm font-medium text-white">Position KEFRI paper inventory sheet inside reticle</p>
                <p className="text-xs text-slate-400">Handwritten measurements transcribed into clean tables</p>
              </div>

              <div className="absolute bottom-4 flex items-center gap-4">
                <button 
                  onClick={() => {
                    if (scanMode === 'batch') setBatchCount(c => c + 1);
                    else setActiveTab('review');
                  }}
                  className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
                >
                  <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white">
                    <Camera size={20} />
                  </div>
                </button>
              </div>
            </div>

            {scanMode === 'batch' && batchCount > 0 && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Batch Ready ({batchCount} Pages)</h4>
                  <p className="text-xs text-slate-500">All pages will be merged into a single structured plot document.</p>
                </div>
                <button 
                  onClick={() => { setActiveTab('review'); setBatchCount(0); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                >
                  Process Batch
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
              <div>
                <h2 className="font-bold text-base text-slate-900">{activeDoc.title}</h2>
                <p className="text-xs text-slate-500">Observer: {activeDoc.observerName} • Plot: {activeDoc.plotCode}</p>
              </div>
              <button 
                onClick={() => handleExportXLSX(activeDoc)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download size={14} /> Export Excel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Original Field Form Scan</h3>
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 font-mono text-xs space-y-2">
                  <div className="text-center font-bold text-slate-800 pb-2 border-b border-slate-200">
                    KENYA FORESTRY RESEARCH INSTITUTE FIELD INVENTORY SHEET
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Plot: {activeDoc.plotCode}</span>
                    <span>Location: Aberdare Forest</span>
                  </div>
                  <div className="pt-2 text-slate-500 italic">
                    [Scanned document image with handwritten tree measurements and coordinate bounding boxes]
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Extracted Structured Table</h3>
                  <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    2 Uncertainties Flagged
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Tree #</th>
                        <th className="p-2.5">Species</th>
                        <th className="p-2.5">DBH (cm)</th>
                        <th className="p-2.5">Height (m)</th>
                        <th className="p-2.5">Health</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {activeDoc.rows.map(row => (
                        <tr key={row.rowNumber} className="hover:bg-slate-50/80 transition">
                          <td className="p-2.5 font-bold">{row.treeNumber}</td>
                          <td className="p-2.5">{row.speciesCode}</td>
                          <td className={`p-2.5 cursor-pointer ${row.flags.dbhUncertain ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200 rounded' : ''}`}
                              onClick={() => setSelectedCell({ rowNum: row.rowNumber, field: 'DBH', value: row.dbhCm, flags: row.flags })}>
                            {row.flags.dbhUncertain && <AlertTriangle size={12} className="inline mr-1 text-amber-600" />}
                            {row.dbhCm}
                          </td>
                          <td className={`p-2.5 cursor-pointer ${row.flags.heightUncertain ? 'bg-amber-50 text-amber-900 font-semibold border border-amber-200 rounded' : ''}`}
                              onClick={() => setSelectedCell({ rowNum: row.rowNumber, field: 'Height', value: row.heightM, flags: row.flags })}>
                            {row.flags.heightUncertain && <AlertTriangle size={12} className="inline mr-1 text-amber-600" />}
                            {row.heightM}
                          </td>
                          <td className="p-2.5">{row.healthStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Scanned Document Archive</h2>
                <p className="text-xs text-slate-500">Search and access past field survey sheets</p>
              </div>
              <div className="w-64">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search plot or station..."
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:border-slate-300 transition shadow-sm">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-900">{doc.title}</h3>
                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                      <span>Type: {doc.fileType}</span>
                      <span>Size: {(doc.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                      <span>Date: {new Date(doc.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setActiveDoc(doc); setActiveTab('review'); }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                    >
                      Open Review
                    </button>
                    <button 
                      onClick={() => handleExportXLSX(doc)}
                      className="p-1.5 text-slate-500 hover:text-slate-800"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-around items-center shadow-sm">
        <button 
          onClick={() => setActiveTab('scan')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition ${activeTab === 'scan' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}
        >
          <Camera size={18} /> Scan
        </button>
        <button 
          onClick={() => setActiveTab('review')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition ${activeTab === 'review' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}
        >
          <FileText size={18} /> Review
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition ${activeTab === 'history' ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}
        >
          <Archive size={18} /> History
        </button>
      </nav>
    </div>
  );
}
