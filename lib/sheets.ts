import type {
  Account,
  Branch,
  MockExam,
  MockScore,
  PhysicalRecord,
  PhysicalTest,
  PortalData,
  Student,
} from "@/lib/dataService";
import type { YogangCard, YogangDetail, YogangSilgiRow } from "@/lib/yogang-data";

export type UniversityLogoRow = {
  university: string;
  logo_url: string;
};

function isValidYogangRow(row: Record<string, string>) {
  return !!normalizeCellValue(row.card_id ?? "");
}

function normalizeHeaderName(header: string) {
  return normalizeCellValue(header).split(/\s+/)[0] ?? "";
}

const SHEET_CACHE_TTL_MS = 1000 * 60 * 30;
const sheetRowsCache = new Map<string, { expiresAt: number; rows: Array<Record<string, string>> }>();
const sheetRowsRequestCache = new Map<string, Promise<Array<Record<string, string>>>>();

function getSheetId() {
  const sheetId = process.env.NEXT_PUBLIC_SHEET_ID;
  if (!sheetId) {
    throw new Error("NEXT_PUBLIC_SHEET_ID is not configured.");
  }
  return sheetId;
}

function buildSheetCsvUrl(sheetName: string) {
  const sheetId = getSheetId();
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

function normalizeCellValue(value: string) {
  return value.replace(/\r/g, "").trim();
}

function isValidStudentRow(row: Record<string, string>) {
  return !!normalizeCellValue(row.student_id ?? "") && !!normalizeCellValue(row.name ?? "");
}

function parseCsvMatrix(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  if (rows.length === 0) {
    return [];
  }

  return rows;
}

export function parseCsv(text: string): Array<Record<string, string>> {
  const rows = parseCsvMatrix(text);

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => normalizeHeaderName(header));

  return dataRows
    .filter((row) => row.some((cell) => normalizeCellValue(cell) !== ""))
    .map((row) => {
      const entry: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (!header) {
          return;
        }
        entry[header] = normalizeCellValue(row[index] ?? "");
      });
      return entry;
    });
}

async function fetchSheetText(sheetName: string) {
  const response = await fetch(`${buildSheetCsvUrl(sheetName)}&_ts=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${sheetName} sheet fetch failed with status ${response.status}`);
  }

  return response.text();
}

async function fetchSheetRows(sheetName: string) {
  const text = await fetchSheetText(sheetName);
  return parseCsv(text);
}

async function fetchSheetRowsCached(sheetName: string) {
  const cached = sheetRowsCache.get(sheetName);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.rows;
  }

  const inFlightRequest = sheetRowsRequestCache.get(sheetName);

  if (inFlightRequest) {
    return inFlightRequest;
  }

  const requestPromise = fetchSheetRows(sheetName)
    .then((rows) => {
      sheetRowsCache.set(sheetName, {
        expiresAt: Date.now() + SHEET_CACHE_TTL_MS,
        rows,
      });
      return rows;
    })
    .finally(() => {
      sheetRowsRequestCache.delete(sheetName);
    });

  sheetRowsRequestCache.set(sheetName, requestPromise);
  return requestPromise;
}

function asRows<T>(rows: Array<Record<string, string>>) {
  return rows.map((row) => row as T);
}

export function getConfiguredSheetId() {
  return getSheetId();
}

export async function getSheetDebugInfo(sheetName: string) {
  const text = await fetchSheetText(sheetName);
  const matrix = parseCsvMatrix(text);
  const rawHeader = matrix[0] ?? [];

  return {
    sheetName,
    rawHeader,
    normalizedHeader: rawHeader.map((header) => normalizeHeaderName(header)),
    rowCount: Math.max(matrix.length - 1, 0),
  };
}

export async function getBranchesSheet() {
  return asRows<Branch>(await fetchSheetRows("branches"));
}

export async function getAccountsSheet() {
  return asRows<Account>(await fetchSheetRows("accounts"));
}

export async function getStudentsSheet() {
  const rows = await fetchSheetRows("students");
  return asRows<Student>(rows.filter(isValidStudentRow));
}

export async function getMockExamsSheet() {
  return asRows<MockExam>(await fetchSheetRows("mock_exams"));
}

export async function getMockScoresSheet() {
  return asRows<MockScore>(await fetchSheetRows("mock_scores"));
}

export async function getPhysicalTestsSheet() {
  return asRows<PhysicalTest>(await fetchSheetRows("physical_tests"));
}

export async function getPhysicalRecordsSheet() {
  return asRows<PhysicalRecord>(await fetchSheetRows("physical_records"));
}

export async function getUniversityLogosSheet() {
  const candidateSheetNames = ["로고주소", "logo"];

  for (const sheetName of candidateSheetNames) {
    const rows = await fetchSheetRowsCached(sheetName);
    const hasExpectedHeaders = rows.some((row) => "university" in row || "logo_url" in row);

    if (hasExpectedHeaders) {
      return asRows<UniversityLogoRow>(
        rows.filter((row) => !!normalizeCellValue(row.university ?? "") && !!normalizeCellValue(row.logo_url ?? ""))
      );
    }
  }

  return [];
}

export async function getYogangCardsSheet() {
  const rows = await fetchSheetRowsCached("yogang_cards");
  return asRows<YogangCard>(rows.filter(isValidYogangRow));
}

export async function getYogangDetailsSheet() {
  const rows = await fetchSheetRowsCached("yogang_details");
  return asRows<YogangDetail>(rows.filter(isValidYogangRow));
}

export async function getYogangSilgiSheet() {
  const rows = await fetchSheetRowsCached("yogang_silgi");
  return asRows<YogangSilgiRow>(rows.filter(isValidYogangRow));
}

export async function getAllPortalData(): Promise<PortalData> {
  const [branches, accounts, students, mockExams, mockScores, physicalTests, physicalRecords] = await Promise.all([
    getBranchesSheet(),
    getAccountsSheet(),
    getStudentsSheet(),
    getMockExamsSheet(),
    getMockScoresSheet(),
    getPhysicalTestsSheet(),
    getPhysicalRecordsSheet(),
  ]);

  return {
    branches,
    accounts,
    students,
    mockExams,
    mockScores,
    physicalTests,
    physicalRecords,
  };
}
