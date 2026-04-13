// Data Service Layer - Abstracts data access for easy switching between backends
// Current: Google Apps Script via REST API
// Future: Direct Google Sheets API or other backends

export type Student = {
  student_id: string;
  student_no: string;
  name: string;
  gender: string;
  birth_date: string;
  school_name: string;
  grade: string | number;
  class_name: string;
  phone: string;
  parent_phone: string;
  branch_id: string;
  admission_year: string;
  status: string;
  memo: string;
  exam_id?: string;
  korean_name?: string;
  korean_raw?: string;
  korean_std?: string;
  korean_pct?: string;
  korean_grade?: string;
  math_name?: string;
  math_raw?: string;
  math_std?: string;
  math_pct?: string;
  math_grade?: string;
  english_raw?: string;
  english_grade?: string;
  inquiry1_name?: string;
  inquiry1_raw?: string;
  inquiry1_std?: string;
  inquiry1_pct?: string;
  inquiry1_grade?: string;
  inquiry2_name?: string;
  inquiry2_raw?: string;
  inquiry2_std?: string;
  inquiry2_pct?: string;
  inquiry2_grade?: string;
  history_raw?: string;
  history_grade?: string;
  // Physical test fields
  back_strength?: string;
  run_10m?: string;
  medicine_ball?: string;
  sit_reach?: string;
  standing_jump?: string;
  run_20m?: string;
  physical_total_score?: string;
  physical_memo?: string;
  login_status?: string;
  created_at?: string;
  updated_at?: string;
};

export type Branch = {
  branch_id: string;
  branch_code?: string;
  branch_name: string;
  [key: string]: string | undefined;
};

export type Account = {
  account_id?: string;
  login_id: string;
  password_hash: string;
  role?: string;
  student_id?: string;
  branch_id?: string;
  name?: string;
  is_active?: string;
  [key: string]: string | undefined;
};

export type Exam = {
  exam_id: string;
  exam_name: string;
  exam_date: string;
  status: string;
  [key: string]: string | undefined;
};

export type MockExam = {
  exam_id: string;
  exam_name: string;
  exam_date?: string;
  status?: string;
  [key: string]: string | undefined;
};

export type MockScore = {
  score_id?: string;
  student_id: string;
  exam_id: string;
  student_name?: string;
  branch_id?: string;
  korean_name?: string;
  korean_raw?: string;
  korean_std?: string;
  korean_pct?: string;
  korean_grade?: string;
  math_name?: string;
  math_raw?: string;
  math_std?: string;
  math_pct?: string;
  math_grade?: string;
  english_raw?: string;
  english_grade?: string;
  inquiry1_name?: string;
  inquiry1_raw?: string;
  inquiry1_std?: string;
  inquiry1_pct?: string;
  inquiry1_grade?: string;
  inquiry2_name?: string;
  inquiry2_raw?: string;
  inquiry2_std?: string;
  inquiry2_pct?: string;
  inquiry2_grade?: string;
  history_raw?: string;
  history_grade?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: string | undefined;
};

export type PhysicalTest = {
  test_id: string;
  test_name: string;
  test_date?: string;
  status?: string;
  [key: string]: string | undefined;
};

export type PhysicalRecord = {
  record_id?: string;
  student_id: string;
  test_id: string;
  student_name?: string;
  branch_id?: string;
  branch_name?: string;
  campus?: string;
  campus_name?: string;
  test_date?: string;
  exam_date?: string;
  back_strength_value: string;
  run_10m_value: string;
  medicine_ball_value: string;
  sit_reach_value: string;
  standing_jump_value: string;
  run_20m_value: string;
  back_strength_score?: string;
  run_10m_score?: string;
  medicine_ball_score?: string;
  sit_reach_score?: string;
  standing_jump_score?: string;
  run_20m_score?: string;
  total_score?: string;
  rank_no?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: string | undefined;
};

export type PortalData = {
  branches: Branch[];
  accounts: Account[];
  students: Student[];
  mockExams: MockExam[];
  mockScores: MockScore[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
};

export type StudentMockChartPoint = {
  exam_id: string;
  label: string;
  exam_name: string;
  exam_date: string;
  korean_std: number;
  math_std: number;
  inquiry1_std: number;
  inquiry2_std: number;
  korean_pct: number;
  math_pct: number;
  inquiry1_pct: number;
  inquiry2_pct: number;
};

export type StudentPhysicalChartPoint = {
  test_id: string;
  label: string;
  short_label: string;
  test_name: string;
  test_date: string;
  rank_no: string;
  total_score: number;
  back_strength: number;
  run_10m: number;
  medicine_ball: number;
  sit_reach: number;
  standing_jump: number;
  run_20m: number;
  back_strength_record: string;
  run_10m_record: string;
  medicine_ball_record: string;
  sit_reach_record: string;
  standing_jump_record: string;
  run_20m_record: string;
  back_strength_score: number;
  run_10m_score: number;
  medicine_ball_score: number;
  sit_reach_score: number;
  standing_jump_score: number;
  run_20m_score: number;
};

export type ApiResponse<T> = {
  ok: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

export function normalizeBranchId(value: unknown) {
  return s(value);
}

export function normalizeAccountRecord(account: Account | null | undefined) {
  if (!account) {
    return null;
  }

  return {
    ...account,
    account_id: s(account.account_id),
    login_id: s(account.login_id),
    password_hash: s(account.password_hash),
    role: s(account.role),
    student_id: s(account.student_id),
    branch_id: s(account.branch_id),
    name: s(account.name),
    is_active: s(account.is_active),
  } satisfies Account;
}

export function resolveAccountBranchId(
  account: Account | null | undefined,
  fallbackBranchId?: unknown
) {
  const normalizedAccount = normalizeAccountRecord(account);
  const branchId = s(normalizedAccount?.branch_id) || s(fallbackBranchId);

  if (!branchId && s(normalizedAccount?.role).toLowerCase() === "student") {
    console.warn("Missing branch_id for student account");
  }

  return branchId;
}

export function normalizeStudentId(input: unknown) {
  if (typeof input === "string" || typeof input === "number") {
    const normalizedValue = String(input).trim();

    if (!normalizedValue || normalizedValue === "[object Object]") {
      throw new Error("Invalid student_id");
    }

    return normalizedValue;
  }

  if (input && typeof input === "object") {
    const candidate = input as {
      student_id?: unknown;
      id?: unknown;
      account_id?: unknown;
    };

    const nestedValue = candidate.student_id ?? candidate.id ?? candidate.account_id;

    if (nestedValue === undefined || nestedValue === null) {
      throw new Error("Invalid student_id");
    }

    return normalizeStudentId(nestedValue);
  }

  throw new Error("Invalid student_id");
}

function getNumericValue(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function getSortableDateValue(rawDate: unknown) {
  const normalizedDate = s(rawDate);
  const dateMatch = normalizedDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!dateMatch) {
    return -1;
  }

  return Number(`${dateMatch[1]}${dateMatch[2].padStart(2, "0")}${dateMatch[3].padStart(2, "0")}`);
}

function buildCompactMonthLabel(rawDate: unknown) {
  const normalizedDate = s(rawDate);
  const dateMatch = normalizedDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!dateMatch) {
    return normalizedDate || "날짜 없음";
  }

  return `${dateMatch[1].slice(2)}년${Number(dateMatch[2])}월`;
}

type StudentMockChartDataArgs = {
  studentId: string;
  mockScores: MockScore[];
  mockExams: MockExam[];
  debug?: boolean;
};

type StudentPhysicalChartDataArgs = {
  studentId: string;
  physicalRecords: PhysicalRecord[];
  physicalTests: PhysicalTest[];
  debug?: boolean;
};

export function getStudentMockChartData({
  studentId,
  mockScores,
  mockExams,
  debug = false,
}: StudentMockChartDataArgs): StudentMockChartPoint[] {
  const normalizedStudentId = s(studentId);
  const matchedScores = mockScores.filter((score) => s(score.student_id) === normalizedStudentId);
  const examsById = new Map(mockExams.map((exam) => [s(exam.exam_id), exam]));

  const chartData = [...matchedScores]
    .sort((left, right) => {
      const rightDate = getSortableDateValue(examsById.get(s(right.exam_id))?.exam_date);
      const leftDate = getSortableDateValue(examsById.get(s(left.exam_id))?.exam_date);

      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return s(left.updated_at).localeCompare(s(right.updated_at));
    })
    .map((score) => {
      const exam = examsById.get(s(score.exam_id));
      const examDate = s(exam?.exam_date);

      return {
        exam_id: s(score.exam_id),
        label: buildCompactMonthLabel(examDate),
        exam_name: s(exam?.exam_name) || s(score.exam_id),
        exam_date: examDate,
        korean_std: getNumericValue(score.korean_std),
        math_std: getNumericValue(score.math_std),
        inquiry1_std: getNumericValue(score.inquiry1_std),
        inquiry2_std: getNumericValue(score.inquiry2_std),
        korean_pct: getNumericValue(score.korean_pct),
        math_pct: getNumericValue(score.math_pct),
        inquiry1_pct: getNumericValue(score.inquiry1_pct),
        inquiry2_pct: getNumericValue(score.inquiry2_pct),
      };
    });

  if (debug) {
    console.debug("[student-mock-chart]", {
      selectedStudentId: normalizedStudentId,
      matchedMockScoresCount: matchedScores.length,
      joinedExamLabels: chartData.map((item) => item.label),
    });
  }

  return chartData;
}

export function getStudentPhysicalChartData({
  studentId,
  physicalRecords,
  physicalTests,
  debug = false,
}: StudentPhysicalChartDataArgs): StudentPhysicalChartPoint[] {
  const normalizedStudentId = s(studentId);
  const matchedRecords = physicalRecords.filter((record) => s(record.student_id) === normalizedStudentId);
  const testsById = new Map(physicalTests.map((test) => [s(test.test_id), test]));

  const chartData = [...matchedRecords]
    .sort((left, right) => {
      const leftDate = getSortableDateValue(s(left.test_date) || testsById.get(s(left.test_id))?.test_date);
      const rightDate = getSortableDateValue(s(right.test_date) || testsById.get(s(right.test_id))?.test_date);

      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return s(left.updated_at).localeCompare(s(right.updated_at));
    })
    .map((record) => {
      const test = testsById.get(s(record.test_id));
      const testDate = s(record.test_date) || s(test?.test_date);

      return {
        test_id: s(record.test_id),
        label: buildCompactMonthLabel(testDate),
        short_label: buildCompactMonthLabel(testDate),
        test_name: s(test?.test_name),
        test_date: testDate,
        rank_no: s(record.rank_no),
        total_score: getNumericValue(record.total_score),
        back_strength: getNumericValue(record.back_strength_score),
        run_10m: getNumericValue(record.run_10m_score),
        medicine_ball: getNumericValue(record.medicine_ball_score),
        sit_reach: getNumericValue(record.sit_reach_score),
        standing_jump: getNumericValue(record.standing_jump_score),
        run_20m: getNumericValue(record.run_20m_score),
        back_strength_record: s(record.back_strength_value),
        run_10m_record: s(record.run_10m_value),
        medicine_ball_record: s(record.medicine_ball_value),
        sit_reach_record: s(record.sit_reach_value),
        standing_jump_record: s(record.standing_jump_value),
        run_20m_record: s(record.run_20m_value),
        back_strength_score: getNumericValue(record.back_strength_score),
        run_10m_score: getNumericValue(record.run_10m_score),
        medicine_ball_score: getNumericValue(record.medicine_ball_score),
        sit_reach_score: getNumericValue(record.sit_reach_score),
        standing_jump_score: getNumericValue(record.standing_jump_score),
        run_20m_score: getNumericValue(record.run_20m_score),
      };
    });

  if (debug) {
    console.debug("[student-physical-chart]", {
      selectedStudentId: normalizedStudentId,
      matchedPhysicalRecordsCount: matchedRecords.length,
      joinedTestLabels: chartData.map((item) => item.label),
    });
  }

  return chartData;
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { ok: false, error: "Server response is empty" };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Invalid JSON response: ${text}` };
  }
}

const COLLECTION_CACHE_TTL_MS = 5_000;
const collectionCache = new Map<string, { expiresAt: number; data: unknown }>();
const collectionRequestCache = new Map<string, Promise<ApiResponse<unknown>>>();

function readCollectionCache<T>(cacheKey: string) {
  const cachedEntry = collectionCache.get(cacheKey);

  if (!cachedEntry || cachedEntry.expiresAt <= Date.now()) {
    collectionCache.delete(cacheKey);
    return null;
  }

  return cachedEntry.data as T;
}

function writeCollectionCache<T>(cacheKey: string, data: T) {
  collectionCache.set(cacheKey, {
    expiresAt: Date.now() + COLLECTION_CACHE_TTL_MS,
    data,
  });
}

function invalidateCollectionCache(cacheKeyPrefix: string) {
  Array.from(collectionCache.keys()).forEach((cacheKey) => {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      collectionCache.delete(cacheKey);
    }
  });

  Array.from(collectionRequestCache.keys()).forEach((cacheKey) => {
    if (cacheKey.startsWith(cacheKeyPrefix)) {
      collectionRequestCache.delete(cacheKey);
    }
  });
}

async function fetchCollectionWithCache<T>({
  cacheKey,
  url,
  extractData,
  fallbackError,
}: {
  cacheKey: string;
  url: string;
  extractData: (result: Record<string, unknown>) => T;
  fallbackError: string;
}): Promise<ApiResponse<T>> {
  const cachedData = readCollectionCache<T>(cacheKey);

  if (cachedData !== null) {
    return {
      ok: true,
      data: cachedData,
    };
  }

  const inFlightRequest = collectionRequestCache.get(cacheKey);

  if (inFlightRequest) {
    return inFlightRequest as Promise<ApiResponse<T>>;
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });
      const rawResult = await safeJson(res);
      const result = rawResult && typeof rawResult === "object" ? (rawResult as Record<string, unknown>) : {};
      const data = extractData(result);

      if (!res.ok || result.ok === false) {
        return {
          ok: false,
          error: String(result.error || fallbackError),
        };
      }

      writeCollectionCache(cacheKey, data);

      return {
        ok: true,
        data,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: `${fallbackError}: ${error?.message || String(error)}`,
      };
    } finally {
      collectionRequestCache.delete(cacheKey);
    }
  })();

  collectionRequestCache.set(cacheKey, requestPromise as Promise<ApiResponse<unknown>>);

  return requestPromise;
}

// === STUDENT OPERATIONS ===

export async function getStudents(examId?: string): Promise<ApiResponse<Student[]>> {
  const examQuery = examId ? `?exam_id=${encodeURIComponent(examId)}` : "";

  return fetchCollectionWithCache<Student[]>({
    cacheKey: `students:${examId || "all"}`,
    url: `/api/students${examQuery}`,
    fallbackError: "Failed to fetch students",
    extractData: (result) => {
      if (Array.isArray(result.students)) {
        return result.students as Student[];
      }

      if (Array.isArray(result.data)) {
        return result.data as Student[];
      }

      if (result.data && typeof result.data === "object" && Array.isArray((result.data as { students?: unknown }).students)) {
        return (result.data as { students: Student[] }).students;
      }

      return [];
    },
  });
}

export async function createStudent(student: Student): Promise<ApiResponse<Student>> {
  try {
    const res = await fetch("/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(student),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to create student",
      };
    }

    invalidateCollectionCache("students:");

    return {
      ok: true,
      data: result.student || student,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to create student: ${error?.message || String(error)}`,
    };
  }
}

export async function updateStudent(student: Student): Promise<ApiResponse<Student>> {
  try {
    const res = await fetch("/api/students", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(student),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to update student",
      };
    }

    invalidateCollectionCache("students:");

    return {
      ok: true,
      data: result.student || student,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to update student: ${error?.message || String(error)}`,
    };
  }
}

export async function deleteStudent(studentId: string): Promise<ApiResponse<void>> {
  try {
    const res = await fetch("/api/students", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({ student_id: studentId }),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to delete student",
      };
    }

    invalidateCollectionCache("students:");

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to delete student: ${error?.message || String(error)}`,
    };
  }
}

// === BRANCH OPERATIONS ===

export async function getBranches(): Promise<ApiResponse<Branch[]>> {
  return fetchCollectionWithCache<Branch[]>({
    cacheKey: "branches:all",
    url: "/api/branches",
    fallbackError: "Failed to fetch branches",
    extractData: (result) => (Array.isArray(result.branches) ? (result.branches as Branch[]) : []),
  });
}

// === EXAM OPERATIONS ===

export async function getExams(): Promise<ApiResponse<Exam[]>> {
  try {
    const res = await fetch(`/api/exams?_ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });
    const result = await safeJson(res);
    
    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to fetch exams",
      };
    }

    return {
      ok: true,
      data: Array.isArray(result.exams) ? result.exams : [],
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to fetch exams: ${error?.message || String(error)}`,
    };
  }
}

export async function createBranch(branch: Branch): Promise<ApiResponse<Branch>> {
  try {
    const res = await fetch("/api/branches", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        action: "saveBranch",
        row: branch,
      }),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to create branch",
      };
    }

    invalidateCollectionCache("branches:");

    return {
      ok: true,
      data: (result.data as Branch | undefined) || branch,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to create branch: ${error?.message || String(error)}`,
    };
  }
}

export async function updateBranch(branch: Branch): Promise<ApiResponse<Branch>> {
  try {
    const res = await fetch("/api/branches", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        action: "saveBranch",
        row: branch,
      }),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to update branch",
      };
    }

    invalidateCollectionCache("branches:");

    return {
      ok: true,
      data: (result.data as Branch | undefined) || branch,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to update branch: ${error?.message || String(error)}`,
    };
  }
}

export async function deleteBranch(branchId: string): Promise<ApiResponse<void>> {
  try {
    const res = await fetch("/api/branches", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        action: "deleteBranch",
        row: { branch_id: branchId },
      }),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to delete branch",
      };
    }

    invalidateCollectionCache("branches:");

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to delete branch: ${error?.message || String(error)}`,
    };
  }
}
