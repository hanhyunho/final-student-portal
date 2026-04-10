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

export function parseCsv(text: string): Array<Record<string, string>> {
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

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => normalizeCellValue(header));

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

async function fetchSheetRows(sheetName: string) {
  const response = await fetch(`${buildSheetCsvUrl(sheetName)}&_ts=${Date.now()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`${sheetName} sheet fetch failed with status ${response.status}`);
  }

  const text = await response.text();
  return parseCsv(text);
}

function asRows<T extends Record<string, string | undefined>>(rows: Array<Record<string, string>>) {
  return rows.map((row) => row as T);
}

export async function getBranchesSheet() {
  return asRows<Branch>(await fetchSheetRows("branches"));
}

export async function getAccountsSheet() {
  return asRows<Account>(await fetchSheetRows("accounts"));
}

export async function getStudentsSheet() {
  return asRows<Student>(await fetchSheetRows("students"));
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