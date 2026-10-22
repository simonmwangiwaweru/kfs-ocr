// Dev-only worst-case fixtures. Open the app with `?data=worst` under `npm run dev`.
// Records use `DEV-` ids, so the store keeps them in memory and never writes them to IndexedDB.
// Every value is something a real form or scan can produce: long French/German headings, an unbreakable
// email, RTL and diacritic names, emoji, empty cells, a 1-row table, an empty table, 1,000 rows.

import type { ScanRecord, ScanRow } from '../db';

const BROKEN_IMAGE = 'data:image/jpeg;base64,/9j/not-a-real-image';

const NAMES = [
  'Aleksandra Wiśniewska-Kowalczyk',
  'Jo',
  'Đặng Thị Ngọc Hân',
  'نور الهدى عبد الرحمن',
  '🦊 Fox',
  'María José de la Cruz y Fernández',
  '  Sam   Lee ',
  'Bartholomew Fitzgerald'
];

const SPECIES = [
  'Juniperus procera',
  'Podocarpus gracilior',
  'Grevillea robusta',
  'Cupressus lusitanica (planted, 1987 compartment, north-east block)',
  'Eucalyptus grandis × camaldulensis hybrid',
  'JUN_P',
  ''
];

function makeRows(count: number, keys: string[]): ScanRow[] {
  return Array.from({ length: count }, (_, i) => {
    const cells: Record<string, string> = {};
    const cellConfidence: Record<string, number> = {};
    const candidateValues: ScanRow['candidateValues'] = {};
    keys.forEach((key, k) => {
      const pick = (i * 7 + k * 3) % 11;
      cells[key] =
        k === 0
          ? String(i + 1).padStart(2, '0')
          : k === 1
            ? SPECIES[(i + k) % SPECIES.length]
            : k === 2
              ? NAMES[(i + k) % NAMES.length]
              : pick === 0
                ? ''
                : pick === 1
                  ? '12345678.9'
                  : pick === 2
                    ? '-42.5'
                    : pick === 3
                      ? 'bartholomew.fitzgerald@northwind-industries-holdings.example.com'
                      : pick === 4
                        ? '0'
                        : (20 + ((i * 13 + k * 5) % 400) / 10).toFixed(1);
      cellConfidence[key] = (i + k) % 6 === 0 ? 0.52 + (((i + k) % 5) * 0.07) : 0.96;
      if (cellConfidence[key] < 0.85 && cells[key]) {
        candidateValues[key] = [
          { value: cells[key], probability: cellConfidence[key], reason: 'Faint ink where the 3 and 8 overlap' },
          { value: cells[key].replace(/\d/, '8'), probability: 1 - cellConfidence[key], reason: 'Loop closed at the top' }
        ];
      }
    });
    return { rowNumber: i + 1, cells, cellConfidence, candidateValues, reviewedCells: {}, comments: [] };
  });
}

const base = (id: string, patch: Partial<ScanRecord>): ScanRecord => ({
  id,
  title: 'Untitled',
  plotCode: '',
  forestStation: '',
  observerName: '',
  date: Date.now() - 3 * 86_400_000,
  fileSizeBytes: 2_411_724,
  fileType: 'image/jpeg',
  syncStatus: 'SYNCED',
  isVerified: false,
  ocrStatus: 'done',
  rows: [],
  ...patch
});

export function worstCaseDocuments(): ScanRecord[] {
  const wideKeys = ['n', 'species', 'recorder', 'dbh', 'height', 'crown', 'health', 'remarks', 'contact'];
  const wideHeaders = [
    'N°',
    'Espèce / nom scientifique et nom vernaculaire',
    'Observateur',
    'Durchmesser in Brusthöhe (BHD) in Zentimetern',
    'Height (m)',
    'Crown width (m)',
    'Health status',
    'Remarks and field notes',
    'Contact'
  ];

  return [
    base('DEV-WIDE', {
      title:
        "Rapport trimestriel de l'inventaire forestier — Réserve forestière de Kakamega, parcelle KFR/KAK/2025/Q3 (révisé après vérification sur le terrain)",
      documentType: 'forestry_inventory',
      institution: 'Kenya Forestry Research Institute — Centre for Forest Ecosystem Research and Conservation, Muguga',
      subHeader: 'Compartment 14, north-east block, adjacent to the Isecheno nature trail and the old sawmill road',
      fileName: 'IMG_20250914_183022_HDR_portrait_edited_edited.HEIC',
      imageDataUrl: BROKEN_IMAGE,
      metadataFields: [
        { label: 'Observer', value: 'Aleksandra Wiśniewska-Kowalczyk' },
        { label: 'Contact', value: 'bartholomew.fitzgerald@northwind-industries-holdings.example.com' },
        { label: 'Plot', value: 'KFR/KAK/2025/Q3' },
        { label: 'Weather', value: 'Overcast, light rain after 14:00, paper damp' },
        { label: 'Altitude', value: '1,584 m' },
        { label: 'Slope', value: '12°' },
        { label: 'Soil', value: 'Humic nitisol' },
        { label: '', value: 'Unlabelled value' }
      ],
      tableHeaders: wideKeys.map((key, i) => ({ key, label: wideHeaders[i] })),
      rows: makeRows(60, wideKeys)
    }),
    base('DEV-ONE', {
      title: 'Untitled',
      documentType: 'general_document',
      tableHeaders: [{ key: 'only', label: 'Value' }],
      rows: makeRows(1, ['only']).map((r) => ({ ...r, cells: { only: '1' }, cellConfidence: { only: 0.97 }, candidateValues: {} }))
    }),
    base('DEV-EMPTY', {
      title: 'Blank form, no rows found',
      documentType: 'tabular_form',
      institution: 'KEFRI',
      tableHeaders: [
        { key: 'a', label: 'Tree' },
        { key: 'b', label: 'DBH' }
      ],
      rows: []
    }),
    base('DEV-PENDING', {
      title: 'IMG 20250914 183022 HDR portrait edited edited',
      fileName: 'IMG_20250914_183022_HDR_portrait_edited_edited.HEIC',
      imageDataUrl: BROKEN_IMAGE,
      ocrStatus: 'pending',
      syncStatus: 'SAVED_OFFLINE'
    }),
    base('DEV-FAILED', {
      title: 'Q3 Board Deck — FINAL (revised) v12 [approved by legal]',
      imageDataUrl: BROKEN_IMAGE,
      ocrStatus: 'failed',
      ocrError:
        'The OCR result was not valid JSON. Try scanning again with a clearer photo, taken square-on in good light, with every border of the table inside the frame.'
    }),
    base('DEV-HUGE', {
      title: 'Full census, all compartments',
      documentType: 'forestry_inventory',
      institution: 'KEFRI',
      tableHeaders: wideKeys.slice(0, 5).map((key, i) => ({ key, label: wideHeaders[i] })),
      rows: makeRows(1000, wideKeys.slice(0, 5))
    })
  ];
}

/** A realistic, well-behaved form for `?data=demo`: what a normal scan looks like. */
export function demoDocuments(): ScanRecord[] {
  const keys = ['tree', 'species', 'dbh', 'height', 'health', 'notes'];
  const data: [string, string, string, string, string, string, number[]][] = [
    ['01', 'JUN_P', '45.3', '28.5', 'Good', '', [0.98, 0.95, 0.97, 0.95, 0.96, 0.99]],
    ['02', 'POD_G', '32.1', '21.0', 'Good', '', [0.98, 0.94, 0.92, 0.9, 0.95, 0.99]],
    ['03', 'GRA_R', '28.7', '19.4', 'Fair', 'Leaning north', [0.97, 0.9, 0.93, 0.91, 0.9, 0.88]],
    ['04', 'POD_G', '22.8', '19.0', 'Fair', '', [0.94, 0.92, 0.91, 0.74, 0.9, 0.99]],
    ['05', 'JUN_P', '51.0', '31.2', 'Good', '', [0.99, 0.96, 0.95, 0.94, 0.97, 0.99]],
    ['06', 'CUP_L', '19.5', '14.8', 'Poor', 'Stem borer damage', [0.97, 0.89, 0.9, 0.9, 0.93, 0.86]],
    ['07', 'GRA_R', '35.4', '25.5', 'Fair', 'Dead branches', [0.96, 0.88, 0.69, 0.89, 0.9, 0.9]],
    ['08', 'JUN_P', '40.2', '27.0', 'Good', '', [0.98, 0.95, 0.96, 0.93, 0.96, 0.99]]
  ];
  const rows: ScanRow[] = data.map((d, i) => {
    const cells = Object.fromEntries(keys.map((k, j) => [k, d[j] as string]));
    const cellConfidence = Object.fromEntries(keys.map((k, j) => [k, d[6][j]]));
    const candidateValues: ScanRow['candidateValues'] = {};
    keys.forEach((k) => {
      if (cellConfidence[k] < 0.85 && cells[k]) {
        candidateValues[k] = [
          { value: cells[k], probability: cellConfidence[k], reason: 'Faint pencil strokes' },
          { value: cells[k].replace('.0', '.8'), probability: 1 - cellConfidence[k], reason: 'Possible closed loop' }
        ];
      }
    });
    return { rowNumber: i + 1, cells, cellConfidence, candidateValues, reviewedCells: {}, comments: [] };
  });
  return [
    base('DEV-DEMO', {
      title: 'Aberdare Forest Reserve: Plot KFR/A2',
      documentType: 'forestry_inventory',
      institution: 'Kenya Forestry Research Institute',
      subHeader: 'Aberdare Forest Reserve',
      personName: 'M. Musyoka',
      idNumber: 'KFR/A2',
      imageDataUrl: '/sample_field_form.jpg',
      date: Date.now() - 2 * 3_600_000,
      fileName: 'plot_a2.jpg',
      metadataFields: [
        { label: 'Plot', value: 'KFR/A2' },
        { label: 'Station', value: 'Aberdare Forest Reserve' },
        { label: 'Observer', value: 'M. Musyoka' },
        { label: 'Date', value: '14/09/2025' }
      ],
      tableHeaders: [
        { key: 'tree', label: 'Tree #' },
        { key: 'species', label: 'Species' },
        { key: 'dbh', label: 'DBH (cm)' },
        { key: 'height', label: 'Height (m)' },
        { key: 'health', label: 'Health' },
        { key: 'notes', label: 'Notes' }
      ],
      rows
    }),
    base('DEV-DEMO-2', {
      title: 'Muguga Research Centre: Plot KFR/M7',
      institution: 'Kenya Forestry Research Institute',
      subHeader: 'Muguga',
      idNumber: 'KFR/M7',
      imageDataUrl: '/sample_field_form.jpg',
      date: Date.now() - 27 * 3_600_000,
      tableHeaders: [
        { key: 'tree', label: 'Tree #' },
        { key: 'species', label: 'Species' }
      ],
      rows: rows.slice(0, 3).map((r) => ({ ...r, cells: { tree: r.cells!.tree, species: r.cells!.species }, cellConfidence: { tree: 0.98, species: 0.97 }, candidateValues: {} }))
    })
  ];
}
