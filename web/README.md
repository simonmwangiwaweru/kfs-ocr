# KFS Inventory Scan: Web App (KEFRI)

Photograph a paper field-inventory sheet, let Google Gemini read the handwriting into a table, check the cells it was unsure about, and export to Excel. Built for the **Kenya Forestry Research Institute**.

## How it works

1. **Scan.** Take a photo or choose one or more images. Photos are downscaled in the browser (2000 px) and saved to IndexedDB *before* anything else happens, so nothing is lost if the network drops.
2. **Read.** The image is sent to Gemini, which returns the table as JSON: column headers, rows, a confidence per cell, and alternative readings for unclear handwriting. Offline, photos queue and are read automatically when the connection returns.
3. **Review.** Cells under 85% confidence are flagged amber. Open one to compare against the photo, pick an alternative reading or type a correction, add a note, and move straight to the next flagged cell.
4. **Export.** Excel, CSV, PDF (print), Word, the original photo, or copy to the clipboard.

Everything is stored on the device. There is no database server.

## Run it

```bash
cd web
npm install
npm run dev          # http://localhost:5173
```

`npm run dev` also serves `POST /api/ocr` (the same handler Vercel runs), so reading works locally once a key is set.

### Gemini key

The key is read **on the server** and is never shipped to the browser.

| Where | How |
| --- | --- |
| Local dev | Put `GEMINI_API_KEY=...` in `web/.env` (or the repo-root `.env`). |
| Vercel | Project → Settings → Environment Variables → `GEMINI_API_KEY`, then redeploy. |
| A single user, no server key | In the app: **Reading** → paste a free key from [Google AI Studio](https://aistudio.google.com/app/apikey). It stays in that browser's `localStorage` and is sent only to Google. |

If you previously set `VITE_GEMINI_API_KEY` on Vercel, the server still accepts it, but rename it to `GEMINI_API_KEY`.

## Project layout

```
api/ocr.js               Vercel function: POST /api/ocr (repo root)
web/server/ocrCore.cjs   Gemini proxy logic shared by Vercel and `vite dev`
web/shared/ocr-config.json  The OCR prompt and model list (server and browser use one copy)
web/src/
  ocr.ts                 Image prep, Gemini call (proxy or user key), response parsing
  store.ts               zustand store: documents, offline queue, undo
  db.ts                  Dexie schema
  lib/documents.ts       Uncertainty rules and pure edit functions
  lib/exporters.ts       xlsx / csv / pdf / word / image / clipboard
  components/            Scan, Review, Archive, CellInspector, KeyDialog, ...
  dev/worstCase.ts       Dev-only fixtures (see below)
```

## Design notes

- **Motion** follows one token set in `src/index.css` (`--ease-out`, `--ease-in-out`, `--ease-drawer`). Only `transform` and `opacity` animate. Press feedback is `scale(0.97)` in 160 ms. Dialogs are centered on desktop and bottom sheets on phones, and leave faster than they arrive. Tab switches, cell selection and "next flagged" are intentionally instant. They happen many times a day.
- `prefers-reduced-motion` keeps fades and drops movement. `prefers-reduced-transparency` turns the frosted header and tab bar solid.
- Hover styles compile only inside `@media (hover: hover)`; touch devices never get a stuck hover.
- System fonts only, so the app renders correctly offline.

## Testing with awkward data

In dev, open `http://localhost:5173/?data=worst` for long titles, an unbreakable email, RTL and emoji names, empty cells, a 1-row table, an empty table, a failed scan and a 1,000-row table. `?data=demo` loads a realistic sample. These records live in memory only and are never written to IndexedDB.
