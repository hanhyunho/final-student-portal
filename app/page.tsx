"use client";

import React, { useEffect, useMemo, useState } from "react";
import { savePortalRow } from "@/lib/save";
import type {
  Account,
  Branch,
  MockExam,
  MockScore,
  PhysicalTest,
  PhysicalRecord,
  Student,
  StudentMockChartPoint,
  StudentPhysicalChartPoint,
} from "@/lib/dataService";
import { getStudentMockChartData, getStudentPhysicalChartData } from "@/lib/dataService";
import { StudentModal } from "@/components/StudentModal";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";
import { StudentChartSection } from "@/components/StudentChartSection";

type SortType =
  | "default"
  | "name"
  | "studentNo"
  | "avgDesc"
  | "koreanDesc"
  | "mathDesc"
  | "englishDesc";

type ModalMode = "add" | "edit";

type Role = "super_admin" | "branch_manager" | "student" | "";

type AccountSession = {
  account_id: string;
  login_id: string;
  role: string;
  student_id: string;
  branch_id: string;
  name: string;
};

type PortalDataMode = "auth" | "scoped";

const PORTAL_ACCOUNT_SESSION_KEY = "portal_account";

const SCORE_FIELD_KEYS = [
  "korean_name",
  "korean_raw",
  "korean_std",
  "korean_pct",
  "korean_grade",
  "math_name",
  "math_raw",
  "math_std",
  "math_pct",
  "math_grade",
  "english_raw",
  "english_grade",
  "inquiry1_name",
  "inquiry1_raw",
  "inquiry1_std",
  "inquiry1_pct",
  "inquiry1_grade",
  "inquiry2_name",
  "inquiry2_raw",
  "inquiry2_std",
  "inquiry2_pct",
  "inquiry2_grade",
  "history_raw",
  "history_grade",
] as const;

const DEFAULT_PHYSICAL_TESTS: PhysicalTest[] = [
  {
    test_id: "physical-test-2026-01",
    test_name: "실기측정 1차",
    test_date: "2026-03-27",
    status: "active",
  },
  {
    test_id: "physical-test-2026-02",
    test_name: "실기측정 2차",
    test_date: "2026-08-21",
    status: "active",
  },
];

function normalizePhysicalTests(tests: PhysicalTest[]) {
  const defaultsById = new Map(DEFAULT_PHYSICAL_TESTS.map((test) => [test.test_id, test]));

  return tests.map((test) => {
    const fallback = defaultsById.get(s(test.test_id));
    if (!fallback) {
      return test;
    }

    const nextName = s(test.test_name).trim();
    const hasDate = !!s(test.test_date).trim();
    const hasLegacyYearPrefix = /^\d{4}\b/.test(nextName);

    if (hasDate && !hasLegacyYearPrefix) {
      return test;
    }

    return {
      ...test,
      test_name: hasLegacyYearPrefix ? fallback.test_name : nextName || fallback.test_name,
      test_date: hasDate ? test.test_date : fallback.test_date,
    };
  });
}

function s(value: unknown) {
  return String(value ?? "");
}

function normalizeCompareText(value: unknown) {
  return s(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRole(value: unknown): Role {
  const normalized = normalizeCompareText(value);

  if (normalized === "super_admin" || normalized === "branch_manager" || normalized === "student") {
    return normalized;
  }

  return "";
}

function buildAccountSession(account: Account): AccountSession {
  return {
    account_id: s(account.account_id).trim(),
    login_id: s(account.login_id).trim(),
    role: s(account.role).trim(),
    student_id: s(account.student_id).trim(),
    branch_id: s(account.branch_id).trim(),
    name: s(account.name).trim(),
  };
}

function buildPortalDataUrl(mode: PortalDataMode, account?: Account | null) {
  const params = new URLSearchParams({
    _ts: String(Date.now()),
    mode,
  });

  if (mode === "scoped" && account) {
    params.set("role", normalizeRole(account.role));
    params.set("branch_id", s(account.branch_id).trim());
    params.set("student_id", s(account.student_id).trim());
  }

  return `/api/portal-data?${params.toString()}`;
}

function isTruthy(value: unknown) {
  const normalized = s(value).trim();
  if (normalized === "") {
    return true;
  }
  return /^(true|1|y|yes)$/i.test(normalized);
}

function buildGeneratedId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSortableDateValue(rawDate: unknown) {
  const normalizedDate = s(rawDate).trim();
  const dateMatch = normalizedDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!dateMatch) {
    return -1;
  }

  return Number(`${dateMatch[1]}${dateMatch[2].padStart(2, "0")}${dateMatch[3].padStart(2, "0")}`);
}

function pickScoreFields(score?: MockScore | null): Partial<Student> {
  if (!score) {
    return {};
  }

  return {
    korean_name: s(score.korean_name),
    korean_raw: s(score.korean_raw),
    korean_std: s(score.korean_std),
    korean_pct: s(score.korean_pct),
    korean_grade: s(score.korean_grade),
    math_name: s(score.math_name),
    math_raw: s(score.math_raw),
    math_std: s(score.math_std),
    math_pct: s(score.math_pct),
    math_grade: s(score.math_grade),
    english_raw: s(score.english_raw),
    english_grade: s(score.english_grade),
    inquiry1_name: s(score.inquiry1_name),
    inquiry1_raw: s(score.inquiry1_raw),
    inquiry1_std: s(score.inquiry1_std),
    inquiry1_pct: s(score.inquiry1_pct),
    inquiry1_grade: s(score.inquiry1_grade),
    inquiry2_name: s(score.inquiry2_name),
    inquiry2_raw: s(score.inquiry2_raw),
    inquiry2_std: s(score.inquiry2_std),
    inquiry2_pct: s(score.inquiry2_pct),
    inquiry2_grade: s(score.inquiry2_grade),
    history_raw: s(score.history_raw),
    history_grade: s(score.history_grade),
  };
}

function buildStudentSheetRow(student: Student, existingStudent?: Student | null) {
  const now = new Date().toISOString();

  return {
    ...existingStudent,
    student_id: s(student.student_id).trim() || s(existingStudent?.student_id).trim() || buildGeneratedId("student"),
    student_no: s(student.student_no).trim(),
    name: s(student.name).trim(),
    gender: s(student.gender).trim(),
    birth_date: s(student.birth_date).trim(),
    school_name: s(student.school_name).trim(),
    grade: s(student.grade).trim(),
    class_name: s(student.class_name).trim(),
    phone: s(student.phone).trim(),
    parent_phone: s(student.parent_phone).trim(),
    branch_id: s(student.branch_id).trim(),
    admission_year: s(student.admission_year).trim(),
    status: s(student.status).trim() || "active",
    memo: s(student.memo).trim(),
    exam_id: s(student.exam_id).trim(),
    created_at: s(existingStudent?.created_at).trim() || now,
    updated_at: now,
  };
}

function mergeStudentsWithSheetData({
  students,
  mockExams,
  mockScores,
  physicalTests,
  physicalRecords,
}: {
  students: Student[];
  mockExams: MockExam[];
  mockScores: MockScore[];
  physicalTests: PhysicalTest[];
  physicalRecords: PhysicalRecord[];
}) {
  const scoreDateByExamId = new Map(mockExams.map((exam) => [s(exam.exam_id), getSortableDateValue(exam.exam_date)]));
  const physicalDateByTestId = new Map(physicalTests.map((test) => [s(test.test_id), getSortableDateValue(test.test_date)]));
  const scoresByStudentId = new Map<string, MockScore[]>();
  const physicalByStudentId = new Map<string, PhysicalRecord[]>();

  mockScores.forEach((score) => {
    const studentId = s(score.student_id).trim();
    if (!studentId) {
      return;
    }
    const nextScores = scoresByStudentId.get(studentId) || [];
    nextScores.push(score);
    scoresByStudentId.set(studentId, nextScores);
  });

  physicalRecords.forEach((record) => {
    const studentId = s(record.student_id).trim();
    if (!studentId) {
      return;
    }
    const nextRecords = physicalByStudentId.get(studentId) || [];
    nextRecords.push(record);
    physicalByStudentId.set(studentId, nextRecords);
  });

  return students.map((student) => {
    const studentId = s(student.student_id).trim();
    const studentScores = [...(scoresByStudentId.get(studentId) || [])].sort((left, right) => {
      const dateDiff = (scoreDateByExamId.get(s(right.exam_id)) || -1) - (scoreDateByExamId.get(s(left.exam_id)) || -1);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return s(right.updated_at).localeCompare(s(left.updated_at));
    });
    const examScores = studentScores.reduce<Record<string, Partial<Student>>>((accumulator, score) => {
      const examId = s(score.exam_id).trim();
      if (examId) {
        accumulator[examId] = pickScoreFields(score);
      }
      return accumulator;
    }, {});
    const currentExamId = s(student.exam_id).trim() || s(studentScores[0]?.exam_id).trim();
    const primaryScore = studentScores.find((score) => s(score.exam_id).trim() === currentExamId) || studentScores[0] || null;

    const studentPhysicalRecords = [...(physicalByStudentId.get(studentId) || [])].sort((left, right) => {
      const dateDiff = (physicalDateByTestId.get(s(right.test_id)) || -1) - (physicalDateByTestId.get(s(left.test_id)) || -1);
      if (dateDiff !== 0) {
        return dateDiff;
      }
      return s(right.updated_at).localeCompare(s(left.updated_at));
    });
    const latestPhysicalRecord = studentPhysicalRecords[0];

    const mergedStudent: Student = {
      ...student,
      exam_id: currentExamId,
      ...pickScoreFields(primaryScore),
      back_strength: s(latestPhysicalRecord?.back_strength_value || student.back_strength),
      run_10m: s(latestPhysicalRecord?.run_10m_value || student.run_10m),
      medicine_ball: s(latestPhysicalRecord?.medicine_ball_value || student.medicine_ball),
      sit_reach: s(latestPhysicalRecord?.sit_reach_value || student.sit_reach),
      standing_jump: s(latestPhysicalRecord?.standing_jump_value || student.standing_jump),
      run_20m: s(latestPhysicalRecord?.run_20m_value || student.run_20m),
      physical_total_score: s(latestPhysicalRecord?.total_score || student.physical_total_score),
      physical_memo: s(latestPhysicalRecord?.memo || student.physical_memo),
    };

    (mergedStudent as any).exam_scores = examScores;
    return mergedStudent;
  });
}

function getScoreNumber(value: string | number | undefined) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function getAverageNumber(student: Student) {
  const scores = [
    getScoreNumber(student.korean_raw),
    getScoreNumber(student.math_raw),
    getScoreNumber(student.english_raw),
    getScoreNumber(student.inquiry1_raw),
    getScoreNumber(student.inquiry2_raw),
  ].filter((v) => v > 0);

  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function getStatusStyle(status: string | undefined): React.CSSProperties {
  if ((status || "").toLowerCase() === "active") {
    return { background: "#dcfce7", color: "#166534" };
  }
  return { background: "#e5e7eb", color: "#374151" };
}

function getGradeBadgeStyle(grade: string | number | undefined): React.CSSProperties {
  const g = Number(grade || 0);
  if (g === 1 || g === 2) return { background: "#dcfce7", color: "#166534" };
  if (g === 3 || g === 4) return { background: "#dbeafe", color: "#1d4ed8" };
  if (g === 5 || g === 6) return { background: "#fef3c7", color: "#92400e" };
  return { background: "#fee2e2", color: "#b91c1c" };
}

function getBarWidth(value: string | number | undefined) {
  const score = getScoreNumber(value);
  return `${Math.max(0, Math.min(100, score))}%`;
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { ok: false, error: "서버 응답이 비어 있습니다." };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `JSON이 아닌 응답입니다: ${text}` };
  }
}

function csvEscape(value: unknown) {
  const str = String(value ?? "");
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function debugLogLoginFailure(reason: "id mismatch" | "password mismatch" | "inactive", account: Account) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.log("[login-debug]", reason, {
    login_id: s(account.login_id).trim(),
    password_hash: s(account.password_hash).trim(),
    is_active: s(account.is_active).trim(),
    role: s(account.role).trim(),
  });
}

export default function Home() {
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [mockExams, setMockExams] = useState<MockExam[]>([]);
  const [mockScores, setMockScores] = useState<MockScore[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTest[]>(DEFAULT_PHYSICAL_TESTS);
  const [physicalRecords, setPhysicalRecords] = useState<PhysicalRecord[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortType, setSortType] = useState<SortType>("default");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [saving, setSaving] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const students = useMemo(
    () =>
      mergeStudentsWithSheetData({
        students: rawStudents,
        mockExams,
        mockScores,
        physicalTests,
        physicalRecords,
      }),
    [mockExams, mockScores, physicalRecords, physicalTests, rawStudents]
  );

  const currentRole = normalizeRole(currentAccount?.role);
  const currentStudentId = s(currentAccount?.student_id).trim();
  const currentBranchId = s(currentAccount?.branch_id).trim();
  const isSuperAdmin = currentRole === "super_admin";
  const isBranchManager = currentRole === "branch_manager";
  const isStudentRole = currentRole === "student";
  const canManageStudents = isSuperAdmin || isBranchManager;

  const getBranchLabel = (branchId: string | undefined) => {
    const found = branches.find((b) => s(b.branch_id) === s(branchId));
    return found ? s(found.branch_name) : branchId || "-";
  };

  const loadPortalData = async ({
    mode,
    account,
    focusStudentId,
  }: {
    mode: PortalDataMode;
    account?: Account | null;
    focusStudentId?: string;
  }) => {
    setLoading(true);

    try {
      const res = await fetch(buildPortalDataUrl(mode, account), {
        method: "GET",
        cache: "no-store",
      });
      const result = await safeJson(res);

      if (!res.ok || result.success === false) {
        setRawStudents([]);
        setBranches([]);
        setAccounts([]);
        setMockExams([]);
        setMockScores([]);
        setPhysicalTests(DEFAULT_PHYSICAL_TESTS);
        setPhysicalRecords([]);
        setSelectedStudentId(null);
        return;
      }

      const nextBranches = Array.isArray(result.branches) ? (result.branches as Branch[]) : [];
      const nextAccounts = Array.isArray(result.accounts) ? (result.accounts as Account[]) : [];
      const nextStudents = Array.isArray(result.students) ? (result.students as Student[]) : [];
      const nextMockExams = Array.isArray(result.mockExams) ? (result.mockExams as MockExam[]) : [];
      const nextMockScores = Array.isArray(result.mockScores) ? (result.mockScores as MockScore[]) : [];
      const nextPhysicalTests = normalizePhysicalTests(
        Array.isArray(result.physicalTests) && result.physicalTests.length > 0
          ? (result.physicalTests as PhysicalTest[])
          : DEFAULT_PHYSICAL_TESTS
      );
      const nextPhysicalRecords = Array.isArray(result.physicalRecords)
        ? (result.physicalRecords as PhysicalRecord[])
        : [];

      if (process.env.NODE_ENV === "development") {
        if (mode === "auth") {
          console.log(
            "[accounts-debug:first-5]",
            nextAccounts.slice(0, 5).map((account) => ({
              login_id: s(account.login_id).trim(),
              password_hash: s(account.password_hash).trim(),
              is_active: s(account.is_active).trim(),
              role: s(account.role).trim(),
            }))
          );
        }

        console.log("[portal-data-counts]", {
          mode,
          role: mode === "scoped" ? normalizeRole(account?.role) : "auth",
          branchCount: nextBranches.length,
          studentCount: nextStudents.length,
          mockScoreCount: nextMockScores.length,
          physicalRecordCount: nextPhysicalRecords.length,
        });
      }

      setBranches(nextBranches);
      if (mode === "auth") {
        setAccounts(nextAccounts);
      }
      setRawStudents(nextStudents);
      setMockExams(nextMockExams);
      setMockScores(nextMockScores);
      setPhysicalTests(nextPhysicalTests);
      setPhysicalRecords(nextPhysicalRecords);
      setSelectedStudentId((prev) => {
        if (focusStudentId && nextStudents.some((st) => s(st.student_id) === s(focusStudentId))) {
          return focusStudentId;
        }
        if (prev && nextStudents.some((st) => s(st.student_id) === s(prev))) {
          return prev;
        }
        return nextStudents[0]?.student_id ? s(nextStudents[0].student_id) : null;
      });
    } catch {
      setRawStudents([]);
      setBranches([]);
      setAccounts([]);
      setMockExams([]);
      setMockScores([]);
      setPhysicalTests(DEFAULT_PHYSICAL_TESTS);
      setPhysicalRecords([]);
      setSelectedStudentId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData({ mode: "auth" });
  }, []);

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    loadPortalData({
      mode: "scoped",
      account: currentAccount,
      focusStudentId: s(currentAccount.student_id).trim() || undefined,
    });
  }, [currentAccount]);

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    try {
      const savedAccountText = sessionStorage.getItem(PORTAL_ACCOUNT_SESSION_KEY);

      if (savedAccountText) {
        const savedAccount = JSON.parse(savedAccountText) as Partial<AccountSession>;
        const savedAccountId = s(savedAccount.account_id).trim();
        const savedLoginId = s(savedAccount.login_id).trim();
        const matchedAccount = accounts.find((account) => {
          if (!isTruthy(account.is_active)) {
            return false;
          }

          if (savedAccountId && s(account.account_id).trim() === savedAccountId) {
            return true;
          }

          return savedLoginId !== "" && s(account.login_id).trim() === savedLoginId;
        });

        if (matchedAccount) {
          setCurrentAccount(matchedAccount);
          return;
        }
      }

      const legacyLoginId = sessionStorage.getItem("portal_login_id");
      if (!legacyLoginId) {
        return;
      }

      const matchedAccount = accounts.find(
        (account) => s(account.login_id).trim() === s(legacyLoginId).trim() && isTruthy(account.is_active)
      );

      if (matchedAccount) {
        setCurrentAccount(matchedAccount);
      }
    } catch {}
  }, [accounts]);

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    const currentStudentId = s(currentAccount.student_id).trim();
    const currentBranchId = s(currentAccount.branch_id).trim();

    if (currentBranchId) {
      setBranchFilter(currentBranchId);
    }

    if (currentStudentId) {
      setSelectedStudentId(currentStudentId);
    }
  }, [currentAccount]);

  const scopedStudents = useMemo(() => {
    if (!currentAccount) {
      return students;
    }

    if (isSuperAdmin) {
      return students;
    }

    if (isBranchManager) {
      return students.filter((student) => s(student.branch_id).trim() === currentBranchId);
    }

    if (isStudentRole) {
      return students.filter((student) => s(student.student_id).trim() === currentStudentId);
    }

    return [];
  }, [currentAccount, currentBranchId, currentStudentId, isBranchManager, isStudentRole, isSuperAdmin, students]);

  const scopedStudentIds = useMemo(
    () => new Set(scopedStudents.map((student) => s(student.student_id).trim()).filter(Boolean)),
    [scopedStudents]
  );

  const scopedBranches = useMemo(() => {
    if (!currentAccount || isSuperAdmin) {
      return branches;
    }

    if (isBranchManager) {
      return branches.filter((branch) => s(branch.branch_id).trim() === currentBranchId);
    }

    if (isStudentRole) {
      const studentBranchId = s(scopedStudents[0]?.branch_id).trim() || currentBranchId;
      return branches.filter((branch) => s(branch.branch_id).trim() === studentBranchId);
    }

    return [];
  }, [branches, currentAccount, currentBranchId, isBranchManager, isStudentRole, isSuperAdmin, scopedStudents]);

  const scopedMockScores = useMemo(
    () => mockScores.filter((score) => scopedStudentIds.has(s(score.student_id).trim())),
    [mockScores, scopedStudentIds]
  );

  const scopedPhysicalRecords = useMemo(
    () => physicalRecords.filter((record) => scopedStudentIds.has(s(record.student_id).trim())),
    [physicalRecords, scopedStudentIds]
  );

  const accessIssueMessage = useMemo(() => {
    if (!currentAccount) {
      return "";
    }

    if (!currentRole) {
      return "이 계정의 role 값이 유효하지 않습니다. accounts 시트의 role 값을 확인하세요.";
    }

    if (isBranchManager && !currentBranchId) {
      return "branch_manager 계정에 branch_id가 없습니다. accounts 시트를 확인하세요.";
    }

    if (isStudentRole && !currentStudentId) {
      return "student 계정에 student_id가 없습니다. accounts 시트를 확인하세요.";
    }

    if (isStudentRole && currentStudentId && scopedStudents.length === 0 && !loading) {
      return "연결된 student_id의 학생 데이터를 찾을 수 없습니다.";
    }

    return "";
  }, [currentAccount, currentBranchId, currentRole, currentStudentId, isBranchManager, isStudentRole, loading, scopedStudents.length]);

  const canAccessStudentRecord = (student: Student | null | undefined) => {
    if (!student) {
      return false;
    }

    if (isSuperAdmin) {
      return true;
    }

    if (isBranchManager) {
      return s(student.branch_id).trim() === currentBranchId;
    }

    if (isStudentRole) {
      return s(student.student_id).trim() === currentStudentId;
    }

    return false;
  };

  const blockUnauthorizedAction = (message: string) => {
    alert(message);
  };

  const selectedStudent = useMemo(
    () => scopedStudents.find((st) => s(st.student_id) === s(selectedStudentId)) || null,
    [scopedStudents, selectedStudentId]
  );

  const selectedStudentMockChartData = useMemo<StudentMockChartPoint[]>(() => {
    if (!selectedStudent?.student_id) {
      return [];
    }

    return getStudentMockChartData({
      studentId: s(selectedStudent.student_id),
      mockScores: scopedMockScores,
      mockExams,
      debug: true,
    });
  }, [mockExams, scopedMockScores, selectedStudent?.student_id]);

  const selectedStudentPhysicalChartData = useMemo<StudentPhysicalChartPoint[]>(() => {
    if (!selectedStudent?.student_id) {
      return [];
    }

    return getStudentPhysicalChartData({
      studentId: s(selectedStudent.student_id),
      physicalRecords: scopedPhysicalRecords,
      physicalTests,
      debug: true,
    });
  }, [physicalTests, scopedPhysicalRecords, selectedStudent?.student_id]);

  const branchOptions = useMemo(
    () => (isSuperAdmin ? ["ALL", ...scopedBranches.map((b) => s(b.branch_id)).filter(Boolean)] : scopedBranches.map((b) => s(b.branch_id)).filter(Boolean)),
    [isSuperAdmin, scopedBranches]
  );

  const filteredStudents = useMemo(() => {
    const keyword = search.trim();

    const filtered = scopedStudents.filter((st) => {
      const matchesSearch =
        keyword === "" ||
        s(st.name).includes(keyword) ||
        s(st.school_name).includes(keyword) ||
        s(st.student_no).includes(keyword);

      const matchesBranch = branchFilter === "ALL" || s(st.branch_id) === branchFilter;
      const matchesStatus = statusFilter === "ALL" || s(st.status) === statusFilter;
      return matchesSearch && matchesBranch && matchesStatus;
    });

    const sorted = [...filtered];
    switch (sortType) {
      case "name":
        sorted.sort((a, b) => s(a.name).localeCompare(s(b.name), "ko"));
        break;
      case "studentNo":
        sorted.sort((a, b) => s(a.student_no).localeCompare(s(b.student_no), "ko"));
        break;
      case "avgDesc":
        sorted.sort((a, b) => getAverageNumber(b) - getAverageNumber(a));
        break;
      case "koreanDesc":
        sorted.sort((a, b) => getScoreNumber(b.korean_raw) - getScoreNumber(a.korean_raw));
        break;
      case "mathDesc":
        sorted.sort((a, b) => getScoreNumber(b.math_raw) - getScoreNumber(a.math_raw));
        break;
      case "englishDesc":
        sorted.sort((a, b) => getScoreNumber(b.english_raw) - getScoreNumber(a.english_raw));
        break;
      default:
        break;
    }
    return sorted;
  }, [scopedStudents, search, branchFilter, statusFilter, sortType]);

  useEffect(() => {
    if (!selectedStudentId && filteredStudents.length > 0) {
      setSelectedStudentId(s(filteredStudents[0].student_id));
      return;
    }
    if (
      selectedStudentId &&
      !filteredStudents.some((st) => s(st.student_id) === s(selectedStudentId))
    ) {
      setSelectedStudentId(filteredStudents[0]?.student_id ? s(filteredStudents[0].student_id) : null);
    }
  }, [filteredStudents, selectedStudentId]);

  const summary = useMemo(() => {
    if (filteredStudents.length === 0) return { count: 0, avgScore: "0.0", topAvg: "0.0", activeCount: 0 };
    const avgScore =
      filteredStudents.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / filteredStudents.length;
    const topAvg = Math.max(...filteredStudents.map((st) => getAverageNumber(st)));
    const activeCount = filteredStudents.filter((st) => s(st.status).toLowerCase() === "active").length;
    return {
      count: filteredStudents.length,
      avgScore: avgScore.toFixed(1),
      topAvg: topAvg.toFixed(1),
      activeCount,
    };
  }, [filteredStudents]);

  const quickStats = useMemo(() => {
    const avg80 = filteredStudents.filter((st) => getAverageNumber(st) >= 80).length;
    const koreanTop = filteredStudents.filter((st) => {
      const g = Number(st.korean_grade || 0);
      return g === 1 || g === 2;
    }).length;
    const mathTop = filteredStudents.filter((st) => {
      const g = Number(st.math_grade || 0);
      return g === 1 || g === 2;
    }).length;
    const active = filteredStudents.filter((st) => s(st.status).toLowerCase() === "active").length;
    return { avg80, koreanTop, mathTop, active };
  }, [filteredStudents]);

  const branchStats = useMemo(() => {
    return scopedBranches.map((branch) => {
      const studentsInBranch = scopedStudents.filter((st) => s(st.branch_id) === s(branch.branch_id));
      const count = studentsInBranch.length;
      const avg = count === 0 ? 0 : studentsInBranch.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / count;
      return {
        branch_id: s(branch.branch_id),
        branch_name: s(branch.branch_name),
        count,
        avg: avg.toFixed(1),
      };
    });
  }, [scopedBranches, scopedStudents]);

  const subjectStats = useMemo(() => {
    const avgOf = (key: keyof Student) => {
      const values = scopedStudents
        .map((st) => {
          const rawValue = st[key];
          return getScoreNumber(rawValue as string | number | undefined);
        })
        .filter((v) => v > 0);
      if (values.length === 0) return "0.0";
      return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
    };
    return {
      korean: avgOf("korean_raw"),
      math: avgOf("math_raw"),
      english: avgOf("english_raw"),
      inquiry1: avgOf("inquiry1_raw"),
      inquiry2: avgOf("inquiry2_raw"),
      history: avgOf("history_raw"),
    };
  }, [scopedStudents]);

  const topStudents = useMemo(
    () => {
      // Sort all students by average (including those with 0 average) and take top 5
      const sorted = [...scopedStudents].sort((a, b) => getAverageNumber(b) - getAverageNumber(a));
      // Filter to only include students with at least one score
      return sorted.filter((st) => getAverageNumber(st) > 0).slice(0, 5);
    },
    [scopedStudents]
  );

  const selectedAverage = selectedStudent ? getAverageNumber(selectedStudent).toFixed(1) : "-";

  const selectedIndex = useMemo(
    () => filteredStudents.findIndex((st) => s(st.student_id) === s(selectedStudentId)),
    [filteredStudents, selectedStudentId]
  );

  const moveSelection = (direction: "prev" | "next") => {
    if (filteredStudents.length === 0) return;
    if (selectedIndex === -1) {
      setSelectedStudentId(s(filteredStudents[0].student_id));
      return;
    }
    const nextIndex =
      direction === "prev"
        ? Math.max(0, selectedIndex - 1)
        : Math.min(filteredStudents.length - 1, selectedIndex + 1);
    setSelectedStudentId(s(filteredStudents[nextIndex].student_id));
  };

  const openAddModal = () => {
    if (!canManageStudents) {
      blockUnauthorizedAction("학생 추가 권한이 없습니다.");
      return;
    }

    setModalMode("add");
    setIsModalOpen(true);
  };

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLoginId = s(loginId).trim();
    const trimmedPassword = s(loginPassword).trim();

    const idMatchedAccounts = accounts.filter(
      (account) => s(account.login_id).trim() === trimmedLoginId
    );

    if (idMatchedAccounts.length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("[login-debug] id mismatch", { login_id: trimmedLoginId });
      }
      setLoginError("로그인 정보가 올바르지 않거나 비활성 계정입니다.");
      return;
    }

    const passwordMatchedAccounts = idMatchedAccounts.filter(
      (account) => s(account.password_hash).trim() === trimmedPassword
    );

    if (passwordMatchedAccounts.length === 0) {
      idMatchedAccounts.forEach((account) => debugLogLoginFailure("password mismatch", account));
      setLoginError("로그인 정보가 올바르지 않거나 비활성 계정입니다.");
      return;
    }

    const matchedAccount = passwordMatchedAccounts.find((account) => isTruthy(account.is_active));

    if (!matchedAccount) {
      passwordMatchedAccounts.forEach((account) => debugLogLoginFailure("inactive", account));
      setLoginError("로그인 정보가 올바르지 않거나 비활성 계정입니다.");
      return;
    }

    setCurrentAccount(matchedAccount);
    setLoginError("");

    try {
      sessionStorage.setItem(PORTAL_ACCOUNT_SESSION_KEY, JSON.stringify(buildAccountSession(matchedAccount)));
      sessionStorage.setItem("portal_login_id", s(matchedAccount.login_id));
    } catch {}
  };

  const handleLogout = () => {
    setCurrentAccount(null);
    setLoginId("");
    setLoginPassword("");
    setLoginError("");
    setBranchFilter("ALL");

    try {
      sessionStorage.removeItem(PORTAL_ACCOUNT_SESSION_KEY);
      sessionStorage.removeItem("portal_login_id");
    } catch {}

    loadPortalData({ mode: "auth" });
  };

  const openEditModal = () => {
    if (!canManageStudents) {
      blockUnauthorizedAction("학생 수정 권한이 없습니다.");
      return;
    }

    if (!selectedStudent) {
      alert("수정할 학생을 먼저 선택하세요.");
      return;
    }

    if (!canAccessStudentRecord(selectedStudent)) {
      blockUnauthorizedAction("이 학생 데이터는 수정할 수 없습니다.");
      return;
    }

    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleModalSave = async (student: Student): Promise<Student | null> => {
    if (!canManageStudents) {
      blockUnauthorizedAction("학생 저장 권한이 없습니다.");
      return null;
    }

    const nextStudentInput = isBranchManager
      ? { ...student, branch_id: currentBranchId }
      : student;

    if (modalMode === "edit" && !canAccessStudentRecord(selectedStudent)) {
      blockUnauthorizedAction("이 학생 데이터는 저장할 수 없습니다.");
      return null;
    }

    if (!nextStudentInput.name || !nextStudentInput.school_name || !nextStudentInput.grade || !nextStudentInput.branch_id) {
      alert("이름, 학교, 학년, 지점은 필수입니다.");
      return null;
    }

    try {
      setSaving(true);
      const existingStudent = rawStudents.find(
        (item) => s(item.student_id).trim() === s(nextStudentInput.student_id).trim()
      );
      const nextStudentRow = buildStudentSheetRow(nextStudentInput, existingStudent);

      await savePortalRow({
        sheetName: "students",
        keyField: "student_id",
        row: nextStudentRow,
      });

      setIsModalOpen(false);

      setRawStudents((prev) => {
        const existingIndex = prev.findIndex(
          (item) => s(item.student_id).trim() === s(nextStudentRow.student_id).trim()
        );

        if (existingIndex >= 0) {
          const nextStudents = [...prev];
          nextStudents[existingIndex] = nextStudentRow;
          return nextStudents;
        }

        return [...prev, nextStudentRow];
      });
      setSelectedStudentId(s(nextStudentRow.student_id));
      return nextStudentRow;
    } catch (error) {
      console.error(error);
      alert("저장 중 오류가 발생했습니다.");
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleExamScoreSave = async (
    examId: string,
    scores: Partial<Student>,
    targetStudent?: Pick<Student, "student_id" | "name" | "branch_id">
  ) => {
    if (!canManageStudents) {
      throw new Error("시험 성적 저장 권한이 없습니다.");
    }

    const studentContext = {
      student_id: s(targetStudent?.student_id || selectedStudent?.student_id).trim(),
      name: s(targetStudent?.name || selectedStudent?.name).trim(),
      branch_id: s(targetStudent?.branch_id || selectedStudent?.branch_id).trim(),
    };

    if (!studentContext.student_id) {
      throw new Error("학생 정보가 없어 시험 성적만 저장할 수 없습니다.");
    }

    if (!canAccessStudentRecord(selectedStudent) && !targetStudent) {
      throw new Error("이 학생의 시험 성적은 저장할 수 없습니다.");
    }

    const existingScore = scopedMockScores.find(
      (item) =>
        s(item.student_id).trim() === studentContext.student_id &&
        s(item.exam_id).trim() === s(examId).trim()
    );
    const now = new Date().toISOString();
    const nextScoreRow: MockScore = {
      ...existingScore,
      score_id: s(existingScore?.score_id).trim() || buildGeneratedId(`score-${studentContext.student_id}-${examId}`),
      student_id: studentContext.student_id,
      student_name: studentContext.name,
      branch_id: studentContext.branch_id,
      exam_id: s(examId).trim(),
      created_at: s(existingScore?.created_at).trim() || now,
      updated_at: now,
    };

    SCORE_FIELD_KEYS.forEach((fieldName) => {
      nextScoreRow[fieldName] = s(scores[fieldName as keyof Student]).trim();
    });

    await savePortalRow({
      sheetName: "mock_scores",
      keyField: "score_id",
      row: nextScoreRow as Record<string, unknown>,
    });

    setMockScores((prev) => {
      const existingIndex = prev.findIndex(
        (item) => s(item.score_id).trim() === s(nextScoreRow.score_id).trim()
      );

      if (existingIndex >= 0) {
        const nextScores = [...prev];
        nextScores[existingIndex] = nextScoreRow;
        return nextScores;
      }

      return [...prev, nextScoreRow];
    });
  };

  const handlePhysicalRecordSave = async (record: PhysicalRecord) => {
    if (!canManageStudents) {
      throw new Error("실기 기록 저장 권한이 없습니다.");
    }

    if (!selectedStudent || !canAccessStudentRecord(selectedStudent)) {
      throw new Error("이 학생의 실기 기록은 저장할 수 없습니다.");
    }

    const existingRecord = scopedPhysicalRecords.find(
      (item) =>
        s(item.student_id).trim() === s(record.student_id).trim() &&
        s(item.test_id).trim() === s(record.test_id).trim()
    );
    const now = new Date().toISOString();
    const nextRecord: PhysicalRecord = {
      ...existingRecord,
      ...record,
      record_id: s(existingRecord?.record_id).trim() || s(record.record_id).trim() || buildGeneratedId(`record-${record.student_id}-${record.test_id}`),
      student_id: s(record.student_id).trim(),
      student_name: s(selectedStudent?.name).trim(),
      branch_id: s(selectedStudent?.branch_id).trim(),
      test_id: s(record.test_id).trim(),
      back_strength_value: s(record.back_strength_value).trim(),
      run_10m_value: s(record.run_10m_value).trim(),
      medicine_ball_value: s(record.medicine_ball_value).trim(),
      sit_reach_value: s(record.sit_reach_value).trim(),
      standing_jump_value: s(record.standing_jump_value).trim(),
      run_20m_value: s(record.run_20m_value).trim(),
      created_at: s(existingRecord?.created_at).trim() || now,
      updated_at: now,
    };

    await savePortalRow({
      sheetName: "physical_records",
      keyField: "record_id",
      row: nextRecord as Record<string, unknown>,
    });

    setPhysicalRecords((prev) => {
      const existingIndex = prev.findIndex(
        (item) => s(item.record_id).trim() === s(nextRecord.record_id).trim()
      );

      if (existingIndex >= 0) {
        const nextRecords = [...prev];
        nextRecords[existingIndex] = nextRecord;
        return nextRecords;
      }

      return [...prev, nextRecord];
    });
  };

  const handleDelete = async () => {
    if (!canManageStudents) {
      blockUnauthorizedAction("학생 삭제 권한이 없습니다.");
      return;
    }

    if (!canAccessStudentRecord(selectedStudent)) {
      blockUnauthorizedAction("이 학생 데이터는 삭제할 수 없습니다.");
      return;
    }

    alert("현재 구글시트 연동 단계에서는 삭제 기능이 연결되어 있지 않습니다.");
  };

  const downloadCsv = (rows: Student[], filename: string) => {
    const headers = [
      "student_id",
      "student_no",
      "name",
      "branch_name",
      "school_name",
      "grade",
      "class_name",
      "phone",
      "parent_phone",
      "status",
      "korean_name",
      "korean_raw",
      "korean_std",
      "korean_pct",
      "korean_grade",
      "math_name",
      "math_raw",
      "math_std",
      "math_pct",
      "math_grade",
      "english_raw",
      "english_grade",
      "inquiry1_name",
      "inquiry1_raw",
      "inquiry1_std",
      "inquiry1_pct",
      "inquiry1_grade",
      "inquiry2_name",
      "inquiry2_raw",
      "inquiry2_std",
      "inquiry2_pct",
      "inquiry2_grade",
      "history_raw",
      "history_grade",
      "average",
    ];

    const lines = [
      headers.join(","),
      ...rows.map((st) =>
        [
          st.student_id,
          st.student_no,
          st.name,
          getBranchLabel(s(st.branch_id)),
          st.school_name,
          st.grade,
          st.class_name,
          st.phone,
          st.parent_phone,
          st.status,
          st.korean_name,
          st.korean_raw,
          st.korean_std,
          st.korean_pct,
          st.korean_grade,
          st.math_name,
          st.math_raw,
          st.math_std,
          st.math_pct,
          st.math_grade,
          st.english_raw,
          st.english_grade,
          st.inquiry1_name,
          st.inquiry1_raw,
          st.inquiry1_std,
          st.inquiry1_pct,
          st.inquiry1_grade,
          st.inquiry2_name,
          st.inquiry2_raw,
          st.inquiry2_std,
          st.inquiry2_pct,
          st.inquiry2_grade,
          st.history_raw,
          st.history_grade,
          getAverageNumber(st).toFixed(1),
        ]
          .map(csvEscape)
          .join(",")
      ),
    ];

    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllCsv = () => {
    downloadCsv(filteredStudents, "students_filtered.csv");
  };

  const handleExportBranchCsv = () => {
    const filename =
      branchFilter === "ALL"
        ? "students_all_branches.csv"
        : `students_${getBranchLabel(branchFilter)}.csv`;
    downloadCsv(filteredStudents, filename);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSelected = () => {
    if (!selectedStudent) {
      alert("학생을 먼저 선택하세요.");
      return;
    }
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>${s(selectedStudent.name)} 학생 출력</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin-bottom: 8px; }
            h2 { margin-top: 28px; margin-bottom: 12px; }
            .box { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 14px; }
            .row { display:flex; justify-content:space-between; gap:16px; padding:6px 0; border-bottom:1px solid #f3f4f6; }
            .row:last-child { border-bottom:none; }
          </style>
        </head>
        <body>
          <h1>${s(selectedStudent.name)}</h1>
          <div>${s(selectedStudent.school_name)} / ${s(selectedStudent.grade)}학년 / ${getBranchLabel(s(selectedStudent.branch_id))}</div>

          <h2>기본 정보</h2>
          <div class="box">
            <div class="row"><span>학번</span><span>${s(selectedStudent.student_no)}</span></div>
            <div class="row"><span>성별</span><span>${s(selectedStudent.gender)}</span></div>
            <div class="row"><span>생년월일</span><span>${s(selectedStudent.birth_date)}</span></div>
            <div class="row"><span>연락처</span><span>${s(selectedStudent.phone)}</span></div>
            <div class="row"><span>학부모연락처</span><span>${s(selectedStudent.parent_phone)}</span></div>
            <div class="row"><span>상태</span><span>${s(selectedStudent.status)}</span></div>
            <div class="row"><span>평균</span><span>${getAverageNumber(selectedStudent).toFixed(1)}</span></div>
          </div>

          <h2>성적</h2>
          <div class="box">
            <div class="row"><span>국어</span><span>${s(selectedStudent.korean_raw)} / ${s(selectedStudent.korean_grade)}등급</span></div>
            <div class="row"><span>수학</span><span>${s(selectedStudent.math_raw)} / ${s(selectedStudent.math_grade)}등급</span></div>
            <div class="row"><span>영어</span><span>${s(selectedStudent.english_raw)} / ${s(selectedStudent.english_grade)}등급</span></div>
            <div class="row"><span>탐구1</span><span>${s(selectedStudent.inquiry1_raw)} / ${s(selectedStudent.inquiry1_grade)}등급</span></div>
            <div class="row"><span>탐구2</span><span>${s(selectedStudent.inquiry2_raw)} / ${s(selectedStudent.inquiry2_grade)}등급</span></div>
            <div class="row"><span>한국사</span><span>${s(selectedStudent.history_raw)} / ${s(selectedStudent.history_grade)}등급</span></div>
          </div>

          <h2>메모</h2>
          <div class="box">${s(selectedStudent.memo) || "-"}</div>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={styles.stateBox}>포털 데이터를 불러오는 중입니다...</div>
        </div>
      </main>
    );
  }

  if (!currentAccount) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={{ maxWidth: 420, margin: "80px auto", background: "#ffffff", borderRadius: 18, padding: 28, boxShadow: "0 18px 42px rgba(15, 23, 42, 0.12)", border: "1px solid #dbe7f3" }}>
            <p style={styles.badge}>FINAL 관리자 시스템</p>
            <h1 style={{ margin: "12px 0 8px", fontSize: 28, color: "#0f172a" }}>로그인</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>accounts 시트의 login_id / password_hash / is_active 구조를 사용합니다.</p>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
              <input
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="login_id"
                style={styles.searchInput}
              />
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="password_hash"
                style={styles.searchInput}
              />
              {loginError ? <div style={{ color: "#b91c1c", fontSize: 13 }}>{loginError}</div> : null}
              <button type="submit" style={{ ...styles.addButton, width: "100%", justifyContent: "center" }}>
                로그인
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  if (accessIssueMessage) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <div style={{ maxWidth: 520, margin: "80px auto", background: "#ffffff", borderRadius: 18, padding: 28, boxShadow: "0 18px 42px rgba(15, 23, 42, 0.12)", border: "1px solid #dbe7f3" }}>
            <p style={styles.badge}>권한 확인 필요</p>
            <h1 style={{ margin: "12px 0 8px", fontSize: 28, color: "#0f172a" }}>접근 불가</h1>
            <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>{accessIssueMessage}</p>
            <div style={{ marginTop: 20 }}>
              <button style={styles.secondaryButton} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const roleTitle = isStudentRole
    ? "학생 화면"
    : isBranchManager
    ? "지점관리자 화면"
    : "최고관리자 화면";
  const dashboardBadge = isStudentRole ? "FINAL 학생 포털" : "FINAL 관리자 시스템";
  const dashboardTitle = isStudentRole
    ? "내 성적 대시보드"
    : isBranchManager
    ? "지점 학생 대시보드"
    : "학생 성적 대시보드";
  const dashboardSubtitle = isStudentRole
    ? "본인 성적과 실기 기록만 조회할 수 있습니다."
    : isBranchManager
    ? "내 지점 학생, 성적, 실기 기록만 조회하고 관리합니다."
    : "지점, 학생정보, 성적, 평균, 통계를 한 화면에서 관리합니다.";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.badge}>{dashboardBadge}</p>
            <h1 style={styles.title}>{dashboardTitle}</h1>
            <p style={styles.subtitle}>{dashboardSubtitle}</p>
          </div>
          <div style={styles.headerActions}>
            <div style={{ fontSize: 13, color: "#475569", textAlign: "right" }}>
              <div>{s(currentAccount.name) || s(currentAccount.login_id)}</div>
              <div>{roleTitle}</div>
            </div>
            {isSuperAdmin ? (
              <a href="/branches" style={styles.navLink}>
                지점 관리 →
              </a>
            ) : null}
            <button style={styles.secondaryButton} onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </header>

        {!isStudentRole ? (
          <>
        <section style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>표시 학생 수</span>
            <strong style={styles.summaryValue}>{summary.count}명</strong>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>활성 학생 수</span>
            <strong style={styles.summaryValue}>{summary.activeCount}명</strong>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>전체 평균</span>
            <strong style={styles.summaryValue}>{summary.avgScore}</strong>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryLabel}>최고 평균</span>
            <strong style={styles.summaryValue}>{summary.topAvg}</strong>
          </div>
        </section>

        <section style={styles.quickStatsWrap}>
          <div style={styles.quickChip}>평균 80↑ {quickStats.avg80}명</div>
          <div style={styles.quickChip}>국어 1~2등급 {quickStats.koreanTop}명</div>
          <div style={styles.quickChip}>수학 1~2등급 {quickStats.mathTop}명</div>
          <div style={styles.quickChip}>활성 학생 {quickStats.active}명</div>
        </section>

        <section style={styles.statsSection}>
          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>지점별 현황</h3>
            {branchStats.length === 0 ? (
              <div style={styles.stateBox}>지점 데이터가 없습니다.</div>
            ) : (
              branchStats.map((item) => (
                <div key={item.branch_id} style={styles.statsRow}>
                  <span>{item.branch_name}</span>
                  <span>{item.count}명 / 평균 {item.avg}</span>
                </div>
              ))
            )}
          </div>

          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>과목별 평균</h3>
            <div style={styles.statsRow}><span>국어</span><span>{subjectStats.korean}</span></div>
            <div style={styles.statsRow}><span>수학</span><span>{subjectStats.math}</span></div>
            <div style={styles.statsRow}><span>영어</span><span>{subjectStats.english}</span></div>
            <div style={styles.statsRow}><span>탐구1</span><span>{subjectStats.inquiry1}</span></div>
            <div style={styles.statsRow}><span>탐구2</span><span>{subjectStats.inquiry2}</span></div>
            <div style={styles.statsRow}><span>한국사</span><span>{subjectStats.history}</span></div>
          </div>

          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>상위 평균 학생 TOP 5</h3>
            {topStudents.length === 0 ? (
              <div style={styles.stateBox}>학생 데이터가 없습니다.</div>
            ) : (
              topStudents.map((st, idx) => (
                <div key={s(st.student_id)} style={styles.statsRow}>
                  <span>{idx + 1}. {s(st.name)}</span>
                  <span>{getAverageNumber(st).toFixed(1)}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.chartGrid}>
          <div style={styles.chartPanel}>
            <h3 style={styles.chartPanelTitle}>지점별 평균 차트</h3>
            {branchStats.length === 0 ? (
              <div style={styles.stateBox}>차트 데이터가 없습니다.</div>
            ) : (
              branchStats.map((item) => (
                <div key={item.branch_id} style={styles.branchChartRow}>
                  <div style={styles.branchChartLabel}>
                    <span>{item.branch_name}</span>
                    <span>{item.avg}</span>
                  </div>
                  <div style={styles.branchChartTrack}>
                    <div
                      style={{
                        ...styles.branchChartBar,
                        width: `${Math.max(0, Math.min(100, Number(item.avg)))}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section style={styles.filterBar}>
          <input
            type="text"
            placeholder="이름 / 학교 / 학번 검색"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={styles.searchInput}
          />

          {isSuperAdmin ? (
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} style={styles.select}>
              {branchOptions.map((branch) => (
                <option key={branch} value={branch}>
                  {branch === "ALL" ? "전체 지점" : getBranchLabel(branch)}
                </option>
              ))}
            </select>
          ) : null}

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
            <option value="ALL">전체 상태</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>

          <select value={sortType} onChange={(e) => setSortType(e.target.value as SortType)} style={styles.select}>
            <option value="default">기본순</option>
            <option value="name">이름순</option>
            <option value="studentNo">학번순</option>
            <option value="avgDesc">평균 높은순</option>
            <option value="koreanDesc">국어 높은순</option>
            <option value="mathDesc">수학 높은순</option>
            <option value="englishDesc">영어 높은순</option>
          </select>
        </section>
          </>
        ) : null}

        {!isStudentRole && selectedStudent ? (
          <StudentChartSection
            selectedStudent={selectedStudent}
            getScoreNumber={getScoreNumber}
            getBarWidth={getBarWidth}
            s={s}
          />
        ) : null}

        {isStudentRole ? (
          <section style={styles.studentViewWrap}>
            {selectedStudent ? (
              <StudentChartSection
                selectedStudent={selectedStudent}
                getScoreNumber={getScoreNumber}
                getBarWidth={getBarWidth}
                s={s}
              />
            ) : null}
            <div style={styles.detailCardStatic}>
              {selectedStudent ? (
                <StudentDetailPanel
                  student={selectedStudent}
                  branches={scopedBranches}
                  mockChartData={selectedStudentMockChartData}
                  physicalChartData={selectedStudentPhysicalChartData}
                  canManage={false}
                  sticky={false}
                  onEdit={openEditModal}
                  onDelete={handleDelete}
                  onShowDetail={() => setIsDetailPopupOpen(true)}
                  getAverageNumber={getAverageNumber}
                  getGradeBadgeStyle={getGradeBadgeStyle}
                  getBranchLabel={getBranchLabel}
                  s={s}
                />
              ) : (
                <div style={styles.stateBox}>연결된 학생 정보를 찾을 수 없습니다.</div>
              )}
            </div>
          </section>
        ) : (
        <section style={styles.contentGrid}>
          <div style={styles.leftPanel}>
            <div style={styles.stickyActionBar}>
              <div style={styles.selectedStudentChip}>
                <span style={styles.selectedStudentLabel}>선택학생</span>
                <strong style={styles.selectedStudentText}>
                  {selectedStudent ? s(selectedStudent.name) : "학생을 선택하세요"}
                </strong>
              </div>

              <div style={styles.buttonGroup}>
                <button style={styles.navButton} onClick={() => moveSelection("prev")} disabled={filteredStudents.length === 0 || selectedIndex <= 0}>
                  이전
                </button>
                <button
                  style={styles.navButton}
                  onClick={() => moveSelection("next")}
                  disabled={filteredStudents.length === 0 || selectedIndex === -1 || selectedIndex >= filteredStudents.length - 1}
                >
                  다음
                </button>
                <button style={styles.navButton} onClick={() => selectedStudent && setIsDetailPopupOpen(true)} disabled={!selectedStudent}>
                  상세보기
                </button>
                <button style={styles.navButton} onClick={handleExportAllCsv}>
                  CSV
                </button>
                <button style={styles.navButton} onClick={handleExportBranchCsv}>
                  지점 CSV
                </button>
                <button style={styles.navButton} onClick={handlePrint}>
                  목록 인쇄
                </button>
                <button style={styles.navButton} onClick={handlePrintSelected} disabled={!selectedStudent}>
                  학생 인쇄
                </button>
                {canManageStudents ? <button style={styles.editButton} onClick={openEditModal}>수정</button> : null}
                {canManageStudents ? <button style={styles.deleteButton} onClick={handleDelete}>삭제</button> : null}
                {canManageStudents ? <button style={styles.addButton} onClick={openAddModal}>+ 학생 추가</button> : null}
              </div>
            </div>

            <div style={styles.panelHeader}>
              <div>
                <h3 style={styles.panelTitle}>학생 목록</h3>
                <p style={styles.panelDesc}>검색, 지점, 상태, 평균 정렬이 적용된 결과입니다.</p>
              </div>
            </div>

            <div style={styles.tableWrap}>
              {loading ? (
                <div style={styles.stateBox}>데이터를 불러오는 중입니다...</div>
              ) : filteredStudents.length === 0 ? (
                <div style={styles.stateBox}>검색 결과가 없습니다.</div>
              ) : (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>이름</th>
                      <th style={styles.th}>학번</th>
                      <th style={styles.th}>지점</th>
                      <th style={styles.th}>학교</th>
                      <th style={styles.th}>학년</th>
                      <th style={styles.th}>상태</th>
                      <th style={styles.th}>평균</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((st) => {
                      const isSelected = s(selectedStudentId) === s(st.student_id);

                      return (
                        <tr
                          key={s(st.student_id)}
                          onClick={() => setSelectedStudentId(s(st.student_id))}
                          onDoubleClick={() => {
                            setSelectedStudentId(s(st.student_id));
                            setIsDetailPopupOpen(true);
                          }}
                          style={{ ...styles.row, ...(isSelected ? styles.selectedRow : {}) }}
                        >
                          <td style={styles.tdStrong}>{s(st.name)}</td>
                          <td style={styles.td}>{s(st.student_no) || "-"}</td>
                          <td style={styles.td}>{getBranchLabel(s(st.branch_id))}</td>
                          <td style={styles.td}>{s(st.school_name)}</td>
                          <td style={styles.td}>{s(st.grade)}</td>
                          <td style={styles.td}>
                            <span style={{ ...styles.gradeBadge, ...getStatusStyle(s(st.status)) }}>
                              {s(st.status) || "-"}
                            </span>
                          </td>
                          <td style={styles.td}>{getAverageNumber(st).toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div style={styles.detailCard}>
            {selectedStudent ? (
              <StudentDetailPanel
                student={selectedStudent}
                branches={scopedBranches}
                mockChartData={selectedStudentMockChartData}
                physicalChartData={selectedStudentPhysicalChartData}
                canManage={canManageStudents}
                sticky={true}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onShowDetail={() => setIsDetailPopupOpen(true)}
                getAverageNumber={getAverageNumber}
                getGradeBadgeStyle={getGradeBadgeStyle}
                getBranchLabel={getBranchLabel}
                s={s}
              />
            ) : (
              <div style={styles.stateBox}>학생을 선택하세요.</div>
            )}
          </div>
        </section>
        )}
      </div>

      {isDetailPopupOpen && selectedStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.detailPopupBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>학생 상세 보기</h3>
              <button style={styles.closeButton} onClick={() => setIsDetailPopupOpen(false)}>✕</button>
            </div>
            <StudentDetailPanel
              student={selectedStudent}
              branches={scopedBranches}
              mockChartData={selectedStudentMockChartData}
              physicalChartData={selectedStudentPhysicalChartData}
              canManage={canManageStudents}
              sticky={false}
              onEdit={() => {
                setIsDetailPopupOpen(false);
                openEditModal();
              }}
              onDelete={handleDelete}
              onShowDetail={() => {}} // Already in detail view
              getAverageNumber={getAverageNumber}
              getGradeBadgeStyle={getGradeBadgeStyle}
              getBranchLabel={getBranchLabel}
              s={s}
            />
            <div style={styles.modalFooter}>
              <button style={styles.secondaryButton} onClick={() => setIsDetailPopupOpen(false)}>
                닫기
              </button>
              <button style={styles.navButton} onClick={handlePrintSelected}>
                학생 인쇄
              </button>
            </div>
          </div>
        </div>
      )}

      {canManageStudents ? (
        <StudentModal
          isOpen={isModalOpen}
          mode={modalMode}
          student={modalMode === "edit" ? selectedStudent : null}
          branches={scopedBranches}
          mockExams={mockExams}
          physicalTests={physicalTests}
          physicalRecords={scopedPhysicalRecords}
          saving={saving}
          onClose={() => setIsModalOpen(false)}
          onSave={handleModalSave}
          onSaveExamScores={handleExamScoreSave}
          onSavePhysicalRecord={handlePhysicalRecordSave}
        />
      ) : null}
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #edf3f9 0%, #e8eff7 100%)",
    padding: "32px 20px 40px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1440px",
    margin: "0 auto",
  },
  studentViewWrap: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 860px)",
    justifyContent: "center",
    gap: "20px",
    alignItems: "start",
  },
  detailCardStatic: {
    background: "transparent",
  },
  header: {
    marginBottom: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "20px",
  },
  navLink: {
    padding: "12px 16px",
    background: "#0f766e",
    color: "#ffffff",
    textDecoration: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  headerActions: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "12px",
  },
  examSelector: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  examLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#374151",
  },
  examSelect: {
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    fontSize: "14px",
    background: "#ffffff",
    minWidth: "200px",
  },
  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  title: {
    margin: "0 0 10px 0",
    fontSize: "42px",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: 0,
    color: "#64748b",
    fontSize: "15px",
    lineHeight: 1.6,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  summaryCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #eef2f7",
  },
  summaryLabel: {
    display: "block",
    fontSize: "13px",
    color: "#64748b",
    marginBottom: "10px",
  },
  summaryValue: {
    fontSize: "30px",
    fontWeight: 900,
    color: "#0f172a",
  },
  quickStatsWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  quickChip: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
    color: "#0f172a",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "13px",
    fontWeight: 800,
  },
  statsSection: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  statsCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #eef2f7",
  },
  statsTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: "#0f172a",
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
    color: "#334155",
  },
  chartGrid: {
    marginBottom: "20px",
  },
  chartPanel: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    border: "1px solid #eef2f7",
  },
  chartPanelTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: "#0f172a",
  },
  branchChartRow: {
    marginBottom: "12px",
  },
  branchChartLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: "#334155",
    marginBottom: "6px",
  },
  branchChartTrack: {
    width: "100%",
    height: "14px",
    borderRadius: "999px",
    background: "#e2e8f0",
    overflow: "hidden",
  },
  branchChartBar: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
  },
  filterBar: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  searchInput: {
    width: "320px",
    maxWidth: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#ffffff",
    outline: "none",
  },
  select: {
    minWidth: "170px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    background: "#ffffff",
    outline: "none",
  },
  chartSection: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
    marginBottom: "20px",
  },
  chartHeader: {
    marginBottom: "16px",
  },
  chartTitle: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: 900,
    color: "#0f172a",
  },
  chartDesc: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },
  chartCard: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  chartRow: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  chartLabelWrap: {
    width: "90px",
    flexShrink: 0,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "14px",
    fontWeight: 700,
    color: "#334155",
  },
  chartLabel: {
    color: "#334155",
  },
  chartValue: {
    color: "#0f172a",
    fontWeight: 800,
  },
  chartTrack: {
    flex: 1,
    height: "18px",
    background: "#e2e8f0",
    borderRadius: "999px",
    overflow: "hidden",
  },
  chartBar: {
    height: "100%",
    borderRadius: "999px",
  },
  koreanBar: {
    background: "linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)",
  },
  mathBar: {
    background: "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)",
  },
  englishBar: {
    background: "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  leftPanel: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
  },
  stickyActionBar: {
    position: "sticky",
    top: "14px",
    zIndex: 20,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(6px)",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    padding: "12px 14px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.08)",
  },
  selectedStudentChip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#f8fafc",
    borderRadius: "999px",
    padding: "10px 14px",
  },
  selectedStudentLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#64748b",
  },
  selectedStudentText: {
    fontSize: "14px",
    fontWeight: 900,
    color: "#0f172a",
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  panelTitle: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: 900,
    color: "#0f172a",
  },
  panelDesc: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  addButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  editButton: {
    border: "none",
    background: "#0f766e",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteButton: {
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  navButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "14px 12px",
    borderBottom: "2px solid #e2e8f0",
    background: "#f8fafc",
    textAlign: "left",
    fontSize: "14px",
    color: "#334155",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf2f7",
    fontSize: "14px",
    color: "#334155",
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf2f7",
    fontSize: "14px",
    fontWeight: 800,
    color: "#0f172a",
    whiteSpace: "nowrap",
  },
  row: {
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  selectedRow: {
    background: "#eaf2ff",
    boxShadow: "inset 4px 0 0 #2563eb",
  },
  detailCard: {
    background: "#ffffff",
    padding: "24px",
    borderRadius: "20px",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
    position: "sticky",
    top: "20px",
  },
  detailPopupBox: {
    width: "100%",
    maxWidth: "860px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  selectedBadge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "14px",
  },
  detailName: {
    margin: "0 0 8px 0",
    fontSize: "34px",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: "-0.5px",
  },
  detailSub: {
    margin: "0 0 20px 0",
    color: "#64748b",
    fontSize: "14px",
  },
  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  },
  scoreBox: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "16px",
    minHeight: "98px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  scoreLabel: {
    display: "block",
    fontSize: "12px",
    color: "#64748b",
    marginBottom: "8px",
  },
  scoreValue: {
    fontSize: "26px",
    fontWeight: 900,
    color: "#0f172a",
  },
  gradeBadge: {
    display: "inline-block",
    width: "fit-content",
    padding: "5px 9px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 700,
    marginTop: "8px",
  },
  infoSection: {
    borderTop: "1px solid #e2e8f0",
    borderBottom: "1px solid #e2e8f0",
    padding: "16px 0",
    marginBottom: "20px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "14px",
    marginBottom: "10px",
    color: "#334155",
  },
  infoTitle: {
    fontWeight: 700,
    color: "#64748b",
  },
  subjectPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  subjectTitle: {
    margin: "0 0 4px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: "#0f172a",
  },
  subjectBox: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "16px",
  },
  subjectRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "14px",
    color: "#334155",
    marginBottom: "8px",
  },
  stateBox: {
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "24px",
    fontSize: "14px",
    color: "#64748b",
    textAlign: "center",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "20px",
  },
  modalBox: {
    width: "100%",
    maxWidth: "980px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  modalTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 900,
    color: "#0f172a",
  },
  closeButton: {
    border: "none",
    background: "#f1f5f9",
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 700,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "14px",
  },
  formField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  formFieldWide: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    gridColumn: "1 / -1",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#475569",
  },
  formInput: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  },
  sectionToggle: {
    width: "100%",
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "12px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 800,
    cursor: "pointer",
    textAlign: "left",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};