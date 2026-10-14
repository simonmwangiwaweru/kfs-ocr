# KFS Inventory Scan — Web Application (KEFRI)

A specialized document scanning and data digitization application for the **Kenya Forestry Research Institute (KEFRI)**. Built to replace manual transcription of field paper inventory sheets with automated vision-based table structuring, cell-level uncertainty flagging, reviewer annotations, and Excel/CSV export.

## Architecture

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, SheetJS (`xlsx`)
- **Offline Storage**: IndexedDB (via Dexie.js) for resilient field capture in remote forests
- **Backend API**: Node.js, Express
- **OCR Engine**: Multimodal Vision API with structured JSON Schema output

## Getting Started

### 1. Install dependencies & run frontend
```bash
cd web
npm install
npm run dev
```

### 2. Run backend server
```bash
node server/server.js
```

## Features
- **Corner-bracket Camera Viewfinder**: Framing guides for paper inventory forms
- **Batch Scanning**: Queue multiple sheets before extraction
- **Offline First**: Scans cached in browser IndexedDB; background sync upon reconnection
- **Side-by-Side Review**: Scanned document image next to editable table
- **Cell Uncertainty Flagging**: Ambiguous numbers (<85% confidence) flagged in amber
- **Reviewer Annotations**: Field comments recorded per cell
- **Export**: One-click download as Excel (`.xlsx`) or CSV
