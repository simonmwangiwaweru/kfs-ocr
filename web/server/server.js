// KFS Inventory Scan — Node.js Express API Server
// Endpoints for Vision OCR Extraction, Batch Synchronization, and Structured Data Export

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory / MongoDB sync database store
let documentsDatabase = [
  {
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
        rowNumber: 4,
        treeNumber: "04",
        speciesCode: "POD_G",
        dbhCm: "22.8",
        heightM: "19.0",
        healthStatus: "Fair",
        notes: "",
        confidence: { treeNumber: 0.94, speciesCode: 0.92, dbhCm: 0.91, heightM: 0.74 },
        flags: { dbhUncertain: false, heightUncertain: true },
        comments: [{ id: "c1", author: "Field Officer", text: "Handwritten 19 faint from moisture", timestamp: Date.now() - 3600000, isResolved: false }]
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
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', service: 'KFS Inventory Scan API', timestamp: new Date().toISOString() });
});

// 1. Process Scan / Multimodal Vision Extraction Pipeline
app.post('/api/ocr/extract', async (req, res) => {
  const { plotCode, forestStation, observerName, imageBase64 } = req.body;

  try {
    // Pipeline simulates Vision / Gemini Multimodal Extraction with uncertainty flagging
    const generatedDoc = {
      id: `DOC-KFS-${Date.now()}`,
      title: `${forestStation || 'Field Station'} (Plot ${plotCode || 'PLT-01'})`,
      plotCode: plotCode || 'KFR/A1',
      forestStation: forestStation || 'Aberdare Forest Reserve',
      observerName: observerName || 'Field Technician',
      date: Date.now(),
      fileSizeBytes: imageBase64 ? Math.round(imageBase64.length * 0.75) : 1950000,
      fileType: 'JPEG Form Scan',
      syncStatus: 'SYNCED',
      isVerified: false,
      rows: [
        {
          rowNumber: 1,
          treeNumber: "01",
          speciesCode: "JUN_P",
          dbhCm: "48.2",
          heightM: "29.4",
          healthStatus: "Good",
          notes: "",
          confidence: { treeNumber: 0.98, speciesCode: 0.96, dbhCm: 0.95, heightM: 0.94 },
          flags: { dbhUncertain: false, heightUncertain: false },
          comments: []
        },
        {
          rowNumber: 2,
          treeNumber: "02",
          speciesCode: "POD_G",
          dbhCm: "32.1",
          heightM: "21.0",
          healthStatus: "Good",
          notes: "",
          confidence: { treeNumber: 0.97, speciesCode: 0.94, dbhCm: 0.92, heightM: 0.73 },
          flags: { dbhUncertain: false, heightUncertain: true },
          comments: []
        }
      ]
    };

    documentsDatabase.unshift(generatedDoc);
    res.json({ success: true, document: generatedDoc });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Offline Sync Endpoint
app.post('/api/sync/batch', (req, res) => {
  const { offlineScans } = req.body;
  if (Array.isArray(offlineScans)) {
    for (const scan of offlineScans) {
      scan.syncStatus = 'SYNCED';
      const index = documentsDatabase.findIndex(d => d.id === scan.id);
      if (index >= 0) {
        documentsDatabase[index] = scan;
      } else {
        documentsDatabase.unshift(scan);
      }
    }
  }
  res.json({ success: true, syncedCount: (offlineScans || []).length });
});

// 3. Document Registry
app.get('/api/documents', (req, res) => {
  res.json({ success: true, documents: documentsDatabase });
});

app.listen(PORT, () => {
  console.log(`KFS Inventory Scan backend listening on port ${PORT}`);
});
