import Dexie, { type Table } from 'dexie';

export interface DocumentHeaderColumn {
  key: string;
  label: string;
}

export interface DocumentMetadataItem {
  label: string;
  value: string;
}

export interface ScanRecord {
  id: string;
  title: string;
  documentType?: 'school_bulletin' | 'forestry_inventory' | 'tabular_form' | 'general_document';
  institution?: string;
  subHeader?: string;
  personName?: string;
  idNumber?: string;
  metadataFields?: DocumentMetadataItem[];
  tableHeaders?: DocumentHeaderColumn[];
  plotCode: string;
  forestStation: string;
  observerName: string;
  date: number;
  imageDataUrl?: string;
  fileSizeBytes: number;
  fileType: string;
  syncStatus: 'SAVED_OFFLINE' | 'SYNCING' | 'SYNCED';
  isVerified: boolean;
  rows: Array<{
    rowNumber: number;
    treeNumber: string;
    speciesCode: string;
    dbhCm: string;
    heightM: string;
    healthStatus: string;
    notes: string;
    // Dynamic values for any document type (e.g. col1, col2, etc.)
    cells?: Record<string, string>;
    candidateValues?: Record<string, Array<{ value: string; probability: number; reason?: string }>>;
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
    comments: Array<{
      id: string;
      author: string;
      text: string;
      timestamp: number;
      isResolved: boolean;
    }>;
    isVerified?: boolean;
  }>;
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
