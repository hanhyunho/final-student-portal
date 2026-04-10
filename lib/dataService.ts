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
  korean: number;
  math: number;
  english: number;
  average: number;
};

export type StudentPhysicalChartPoint = {
  test_id: string;
  label: string;
  test_name: string;
  test_date: string;
  total_score: number;
  back_strength: number;
  run_10m: number;
  standing_jump: number;
  run_20m: number;
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

function buildMockExamLabel(exam: MockExam | undefined, score: MockScore) {
  const examName = s(exam?.exam_name) || s(score.exam_id) || "시험";
  const examDate = s(exam?.exam_date);

  return examDate ? `${examName} (${examDate})` : examName;
}

function buildPhysicalTestLabel(test: PhysicalTest | undefined, record: PhysicalRecord) {
  const testName = s(test?.test_name) || "실기";
  const testDate = s(record.test_date) || s(test?.test_date);

  return testDate ? `${testName} (${testDate})` : testName;
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
      const korean = getNumericValue(score.korean_raw);
      const math = getNumericValue(score.math_raw);
      const english = getNumericValue(score.english_raw);
      const averageBase = [korean, math, english].filter((value) => value > 0);

      return {
        exam_id: s(score.exam_id),
        label: buildMockExamLabel(exam, score),
        exam_name: s(exam?.exam_name) || s(score.exam_id),
        exam_date: s(exam?.exam_date),
        korean,
        math,
        english,
        average:
          averageBase.length > 0
            ? Number((averageBase.reduce((sum, value) => sum + value, 0) / averageBase.length).toFixed(1))
            : 0,
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

      return {
        test_id: s(record.test_id),
        label: buildPhysicalTestLabel(test, record),
        test_name: s(test?.test_name),
        test_date: s(record.test_date) || s(test?.test_date),
        total_score: getNumericValue(record.total_score),
        back_strength: getNumericValue(record.back_strength_value),
        run_10m: getNumericValue(record.run_10m_value),
        standing_jump: getNumericValue(record.standing_jump_value),
        run_20m: getNumericValue(record.run_20m_value),
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

// === STUDENT OPERATIONS ===

export async function getStudents(examId?: string): Promise<ApiResponse<Student[]>> {
  try {
    const examQuery = examId ? `&exam_id=${encodeURIComponent(examId)}` : "";
    const res = await fetch(`/api/students?_ts=${Date.now()}${examQuery}`, {
      method: "GET",
      cache: "no-store",
    });
    const result = await safeJson(res);

    const studentData = Array.isArray(result.students)
      ? result.students
      : Array.isArray(result.data)
      ? result.data
      : result.data && Array.isArray(result.data.students)
      ? result.data.students
      : [];

    if (!res.ok || (result.ok === false && studentData.length === 0)) {
      return {
        ok: false,
        error: result.error || "Failed to fetch students",
      };
    }

    return {
      ok: true,
      data: studentData,
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to fetch students: ${error?.message || String(error)}`,
    };
  }
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
  try {
    const res = await fetch(`/api/branches?_ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });
    const result = await safeJson(res);
    
    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to fetch branches",
      };
    }

    return {
      ok: true,
      data: Array.isArray(result.branches) ? result.branches : [],
    };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to fetch branches: ${error?.message || String(error)}`,
    };
  }
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
      body: JSON.stringify(branch),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to create branch",
      };
    }

    return {
      ok: true,
      data: result.branch || branch,
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
      body: JSON.stringify(branch),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to update branch",
      };
    }

    return {
      ok: true,
      data: result.branch || branch,
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
      body: JSON.stringify({ branch_id: branchId }),
    });
    const result = await safeJson(res);

    if (!res.ok || !result.ok) {
      return {
        ok: false,
        error: result.error || "Failed to delete branch",
      };
    }

    return { ok: true };
  } catch (error: any) {
    return {
      ok: false,
      error: `Failed to delete branch: ${error?.message || String(error)}`,
    };
  }
}
