import Dexie, { type Table } from 'dexie';

export interface DocumentHeaderColumn {
  key: string;
  label: string;
}

export interface DocumentMetadataItem {
  label: string;
  value: string;
}

export interface CandidatePrediction {
  value: string;
  probability: number;
  reason?: string;
}

export interface CellComment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  isResolved: boolean;
  /** Column the note belongs to. Notes saved by older versions have no key and belong to the whole row. */
  cellKey?: string;
}

export interface ScanRow {
  rowNumber: number;
  /** Column key -> transcribed text. The source of truth for DBH (Blue ink) display and export. */
  cells?: Record<string, string>;
  /** Column key -> tree height (Red ink annotations). */
  heightCells?: Record<string, string>;
  /** Column key -> OCR confidence, 0..1. */
  cellConfidence?: Record<string, number>;
  candidateValues?: Record<string, CandidatePrediction[]>;
  /** Cells a person has confirmed or corrected. They stop counting as uncertain. */
  reviewedCells?: Record<string, boolean>;
  comments: CellComment[];
  isVerified?: boolean;

  // Fields written by earlier versions. Still read so old scans open correctly.
  treeNumber?: string;
  speciesCode?: string;
  dbhCm?: string;
  heightM?: string;
  healthStatus?: string;
  notes?: string;
  confidence?: { treeNumber: number; speciesCode: number; dbhCm: number; heightM: number };
  flags?: { dbhUncertain: boolean; heightUncertain: boolean };
}

export type OcrStatus = 'done' | 'pending' | 'failed';

export interface ScanRecord {
  id: string;
  title: string;
  documentType?: 'school_bulletin' | 'forestry_inventory' | 'tabular_form' | 'general_document';
  institution?: string;
  subHeader?: string;
  personName?: string;
  idNumber?: string;
  summary?: string;
  metadataFields?: DocumentMetadataItem[];
  tableHeaders?: DocumentHeaderColumn[];
  plotCode: string;
  forestStation: string;
  observerName: string;
  date: number;
  imageDataUrl?: string;
  fileName?: string;
  fileSizeBytes: number;
  fileType: string;
  syncStatus: 'SAVED_OFFLINE' | 'SYNCING' | 'SYNCED';
  isVerified: boolean;
  /** 'pending' = image saved, waiting for a connection or key. 'failed' = last attempt errored. Absent on older scans (= done). */
  ocrStatus?: OcrStatus;
  ocrError?: string;
  visibilityIssues?: Array<{ row: number; col: number; field: string; issue: string }>;
  rows: ScanRow[];
}

export class KfsDatabase extends Dexie {
  scans!: Table<ScanRecord, string>;

  constructor() {
    super('KfsInventoryScanDB');
    this.version(1).stores({
      scans: 'id, plotCode, forestStation, date, syncStatus, isVerified'
    });
  }
}

export const db = new KfsDatabase();
