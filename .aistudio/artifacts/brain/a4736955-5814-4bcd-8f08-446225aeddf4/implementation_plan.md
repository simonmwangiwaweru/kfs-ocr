# KFS Inventory Scan — Phased Implementation Plan

KFS Inventory Scan is a specialized data digitization web application for the Kenya Forest Research Institute (KEFRI) that converts paper field inventory forms containing handwritten tree measurements (e.g. tree height, diameter/width, plot numbers) into clean, structured tables with automated cell-level uncertainty flagging, reviewer annotations, and side-by-side image audit views.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and workflow decisions were aligned during the interactive clarification session:

- **Target Stack & Runtime**: **Web Application** built with React (Vite), Tailwind CSS, Node.js/Express backend, and local browser storage (IndexedDB).
- **OCR & Extraction Pipeline**: **Cloud Vision & Multimodal AI** with strict structured JSON schema extraction. Multimodal models recognize handwritten tabular numbers in spatial contexts where traditional OCR line-grouping algorithms struggle with skewed grids.
- **Offline Field Sync Strategy**: **Local-First IndexedDB Queue with Automatic Background Reconnection Sync**. Scans and metadata are committed locally immediately with queued sync status; once the browser detects an `online` event or network ping, batches upload in background without disrupting field staff.
- **Explicitly Out of Scope**: Aggregate calculations, statistical averages, tree volume computations, and QR code decoding. The focus remains strictly on accurate document digitization, review, and export.

---

## 1. Overview & Core Concept

### What It Does
Field officers measuring forest plots fill out paper grid inventory sheets in remote areas. Rather than returning to headquarters for days of manual data entry, officers photograph forms via camera or batch-upload photos from their gallery. The application processes the forms through a structured extraction pipeline that isolates columns (Tree #, Species Code, DBH/Width, Height, Health Status), flags ambiguous or smudged handwritten digits with confidence indicators, allows cell-by-cell comments, displays the original image alongside the digital grid, and exports directly to CSV/Excel.

### Target Audience & Persona
- **KEFRI Field Technicians**: Operating in dense canopy or remote reserves with intermittent or zero cellular connectivity; need rapid point-and-shoot camera capture with framing guides and batch queuing.
- **Research Data Supervisors**: Reviewing scanned forms at stations, verifying flagged low-confidence cells against the scanned document, adding audit comments, and exporting verified datasets.

### Key Value
- Eliminates manual transcription bottlenecks and transcription typo rates.
- Provides cryptographic and visual traceability: every extracted number links directly to its coordinate bounding box on the original physical scan.

---

## 2. User Experience & Visual Design

### Key User Flows

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  Field Capture  │ ───>  │  Offline Queue  │ ───>  │ Cloud Extraction│
│ Camera/Gallery  │       │   (IndexedDB)   │       │ Vision/JSON Grid│
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                                             │
                                                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ CSV/XLSX Export │ <───  │ Review & Audit  │ <───  │ Side-by-Side UI │
│ Verified Records│       │ Comments & Edits│       │ Flagged Cells   │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Onboarding / Mode Selector**:
   - Welcome banner with KEFRI forest-protection branding.
   - Quick Mode Switcher: "Single Scan", "Batch Mode (Multi-page Plot)", and "Pending Sync Queue".
2. **Scanner Viewfinder**:
   - High-contrast camera viewport with subtle corner-bracket framing guides to align paper margins.
   - Quick controls: Shutter button, Gallery picker, Torch toggle, and Batch counter badge.
3. **Queue & Auto-Sync**:
   - Status chips showing "Saved Locally (Offline)", "Uploading...", or "Processed (Ready for Review)".
4. **Side-by-Side Review View**:
   - Split-screen layout (desktop/tablet) or swipeable dual-pane (mobile) displaying the high-res crop of the scanned document on the left and the editable interactive data table on the right.
   - Zoom & pan synchronization: Clicking a table cell highlights and pans to the corresponding bounding box on the original form.
   - High-uncertainty cells highlighted in amber (`bg-amber-100 text-amber-900 border-amber-400`).
   - Reviewer comment drawer for recording field notes (e.g., *"Tree 14 height smudged by rain; estimated 18.5m from plot log"*).
5. **Document History & Export**:
   - Searchable document registry showing File Name, Plot ID, Date Scanned, Total Rows, Flagged Cells count, and Sync Status.
   - Single-click export to CSV and formatted Excel (.xlsx).

### Visual Identity & Theme
- **Aesthetic Direction**: Utilitarian, crisp, environmental-scientific design. Built for high legibility under bright outdoor sunlight as well as low-glare office review.
- **Color Palette**:
  - Primary Forest: Deep Cypress `#133E2B` (navigation, key action buttons, branding)
  - Secondary Accent: Leaf Sage `#3E7B5C` and Mint `#EAF2EC` (badges, selected states)
  - Surface Neutral: Clean Ivory-White `#FAFAF9` and Off-Slate `#F1F5F9`
  - High-Confidence Data: Slate `#0F172A`
  - Uncertainty Flag: Warm Warning Amber `#D97706` / `#FEF3C7`
  - Verified State: Emerald `#059669` / `#D1FAE5`
- **Typography**: Clean tabular monospaced digits for data tables (`JetBrains Mono` or `Roboto Mono`) paired with robust sans-serif headings (`Inter`).

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: Multimodal Vision AI vs. Traditional Raw OCR
- **Chosen Approach**: Multimodal Vision model with a strict JSON Schema definition for grid extraction rather than bounding-box line OCR.
- **Why**: Traditional OCR frequently splits or merges grid cells when paper rules are broken, faint, or slightly skewed by hand photography. Multimodal Vision models understand spatial grid topologies, column headers, and tabular context directly, outputting `{ row: 1, tree_no: "1", species: "EUC_SAL", dbh: "24.5", height: "18.2", confidence: { dbh: 0.96, height: 0.62 } }`.
- **Alternatives Considered**: Amazon Textract Tables or Tesseract OCR. Textract is capable but requires strict cloud credentials and rigid table syntax that struggles with irregular handwritten Kenyan forestry field codes; Multimodal Vision handles domain-specific context prompts seamlessly.

### Decision 2: Local-First IndexedDB Architecture
- **Chosen Approach**: Dexterous client-side persistence using Dexie.js (IndexedDB wrapper) storing raw image Blobs, scan metadata, and extracted tables locally before backend syncing.
- **Why**: Forest reserves (e.g., Kakamega, Mau, Aberdares) have patchy network connectivity. Field staff cannot wait for network requests while walking survey transects.
- **Alternatives Considered**: Direct upload with optimistic UI. Rejected because dropped connections during large multipart image uploads result in lost field scans.

### Decision 3: Cell-Level Uncertainty Flagging and Audit Trails
- **Chosen Approach**: Dual-level confidence thresholds (confidence < 0.85 marked as "Review Required"). Flagged cells have dedicated comment threads and visual indicators.
- **Why**: Forestry inventory models (allometric biomass equations) are extremely sensitive to erroneous outliers in DBH and height. A single misread decimal place ruins plot volume calculations.

---

## 4. Technical Architecture & Phased Build Plan

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                         │
│                                                                        │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐   │
│   │ Camera View  │     │ Batch Queue  │     │ Side-by-Side Review  │   │
│   │ (HTML5/Canvas│     │  Manager     │     │ (Table + Zoom Viewer)│   │
│   └──────┬───────┘     └──────┬───────┘     └──────────┬───────────┘   │
│          │                    │                        │               │
│          ▼                    ▼                        ▼               │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │              IndexedDB Local Storage (Dexie.js)                │   │
│   │         Scans • Form Batches • Cell Comments • Edits           │   │
│   └───────────────────────────┬────────────────────────────────────┘   │
│                               │                                        │
│                     [Online Sync Engine]                               │
└───────────────────────────────┼────────────────────────────────────────┘
                                │ REST API / Multipart
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                       │
│                                                                        │
│   ┌─────────────────────┐                 ┌────────────────────────┐   │
│   │ Upload & Preprocess │                 │  Export Engine         │   │
│   │ (Sharp: deskew/eq)  │                 │  (json2csv / xlsx)     │   │
│   └──────────┬──────────┘                 └───────────▲────────────┘   │
│              │                                        │                │
│              ▼                                        │                │
│   ┌─────────────────────┐                 ┌───────────┴────────────┐   │
│   │ Multimodal OCR Pipe │ ───JSON Grid──> │ MongoDB / SQLite DB    │   │
│   │ (Structured Vision) │                 │ Document & History Log │   │
│   └─────────────────────┘                 └────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Phased Roadmap & Milestones

#### Phase 1: Project Setup & Core Shell
- Initialize React (Vite) + Tailwind CSS client and Node.js/Express server.
- Establish the visual design system: KEFRI theme tokens, responsive layout shell, and bottom/header navigation.
- Implement client-side IndexedDB database schema (`scans`, `batches`, `tables`, `comments`).
- *Dependencies*: None.
- *Deliverables*: Working UI shell, navigation between Scanner, History, and Review screens, and mock storage verification.

#### Phase 2: Capture Engine & Offline Queue
- Implement HTML5 Camera capture with viewfinder guides (corner brackets, aspect ratio lock) and file upload fallback for mobile galleries.
- Build Multi-page Batch scanning queue allowing capture of multiple sheets sequentially.
- Implement background network listener (`navigator.onLine` and ping health check) with an offline pending tray and sync status badges.
- *Dependencies*: Phase 1 storage layer.
- *Deliverables*: Robust capture of single and multi-page forms, stored locally even in airplane mode.

#### Phase 3: Vision & OCR Structuring Pipeline
- Server-side image preprocessing pipeline using `sharp` (auto-rotation, grayscale conversion, adaptive contrast enhancement for pencil/pen on field paper).
- Structured extraction prompt pipeline connecting to Vision API with deterministic JSON schema output:
  - Columns: `tree_number`, `species_code`, `dbh_cm`, `height_m`, `crown_score`, `notes`.
  - Confidence scoring per extracted field (0.0 to 1.0).
  - Spatial bounding box coordinates normalized to image dimensions `[ymin, xmin, ymax, xmax]`.
- Uncertainty evaluator flagging any value under 0.85 confidence or failing numeric sanity checks (e.g. tree height > 90m or negative numbers).
- *Dependencies*: Phase 2 image capture.
- *Deliverables*: End-to-end extraction from uploaded image to structured JSON table.

#### Phase 4: Side-by-Side Review, Flagging & Comments
- Synchronized split-screen review component:
  - High-resolution pan-and-zoom viewer for the scanned document.
  - Interactive editable data table with cell focus tracking.
  - Highlighting corresponding bounding box on image when table cell is clicked.
- Cell uncertainty badges (amber border, warning icon).
- Reviewer comments interface: click any cell to view, add, or resolve notes (e.g., mark as "Unreadable - flagged for field supervisor").
- Full inline cell editing with audit flag showing original OCR value vs. reviewer edit.
- *Dependencies*: Phase 3 structured data payload.
- *Deliverables*: Fully interactive side-by-side verification experience.

#### Phase 5: Export Engine & History Archive
- Document History view: Searchable, filterable directory showing document ID, scan date, total tree entries, flagged cell counts, and reviewer status.
- Export engine generating:
  - Clean CSV formatted for statistical software (R, Python, Stata).
  - Multi-tab Excel (.xlsx) including both raw extracted data, reviewer notes, and audit log.
- *Dependencies*: Phase 4 data structures.
- *Deliverables*: Complete history exploration and one-click export functions.

#### Phase 6: Field Hardening & Deployment
- Progressive Web App (PWA) manifest and Service Worker caching for offline asset delivery in remote areas.
- Automated retry logic and chunked batch upload for low-bandwidth 2G/3G field connections.
- Deployment configuration: Frontend configured for Vercel/cloud hosting; Express API containerized for scalable deployment.
- *Dependencies*: Phases 1–5.
- *Deliverables*: Production-ready deployed application.

---

## 5. Technical Risks & Early Decisions

| Risk / Open Decision | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Handwritten digit confusion (e.g. 1 vs 7, 0 vs 6, decimal points)** | High: Skews tree height and diameter calculations | Multimodal prompt includes forestry-specific value ranges and Kenyan numeral handwriting nuances; confidence threshold flags ambiguous digits for human review. |
| **Large image upload on weak 2G/3G mobile networks** | Medium: Upload timeouts or data loss | Pre-compress images in browser canvas (JPEG 85%, max 2048px dimension) before queueing in IndexedDB; chunked background sync. |
| **Paper skew / perspective distortion from hand photos** | Medium: Misaligns bounding boxes | OpenCV or client-side canvas quad-detection and perspective correction prior to OCR analysis. |
| **Concurrent edits during review** | Low: Overwritten comments | Version timestamping on review records in local and remote stores. |
