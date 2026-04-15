"use client";

import Image from "next/image";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createRoot } from "react-dom/client";
import { saveMockScore, savePhysicalRecord, saveStudent } from "@/lib/api";
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
import {
  deleteStudent as deleteStudentRecord,
  getStudentMockChartData,
  getStudentPhysicalChartData,
  normalizeAccountRecord,
  normalizeBranchId,
  normalizeStudentId,
  resolveAccountBranchId,
} from "@/lib/dataService";
import { resolveExamSaveGroup } from "@/lib/examSaveState";
import {
  ensurePortalSharedLightData,
  ensurePortalSharedStudentDetails,
  getPortalSharedStudentDetails,
  hasPortalSharedStudentDetails,
  removePortalSharedStudentDetails,
  removePortalSharedStudent,
  resetPortalSharedStore,
  syncPortalSharedLightData,
  syncPortalSharedCurrentAccount,
  upsertPortalSharedStudent,
  usePortalSharedStore,
} from "@/lib/portalStore";
import { AdminDashboard } from "../components/AdminDashboard";
import { AdminHeader } from "@/components/AdminHeader";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentDetailPanel } from "@/components/StudentDetailPanel";
import { PrintStudentDetail } from "@/components/PrintStudentDetail";
import { StudentModal } from "@/components/StudentModal";
import { ConsultPanel, type ConsultStudentInfo } from "@/components/ConsultPanel";
import { resolveConsultType, type ConsultType } from "@/lib/consult-data";
import { portalButtonStyles, portalLayout, portalTheme } from "@/lib/theme";

type SortType =
  | "default"
  | "name"
  | "studentNo"
  | "avgDesc"
  | "koreanDesc"
  | "mathDesc"
  | "englishDesc";

type ModalMode = "add" | "edit";

type DashboardView = "branch-analysis" | "student-management";

type Role = "super_admin" | "branch_manager" | "student" | "";

type AccountSession = {
  account_id: string;
  login_id: string;
  role: string;
  student_id: string;
  branch_id: string;
  name: string;
};

type FeedbackState = {
  type: "success" | "error" | "info";
  message: string;
} | null;

type SaveHandlerOptions = {
  skipRefresh?: boolean;
  suppressFeedback?: boolean;
};

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
  const normalizedAccount = normalizeAccountRecord(account);

  return {
    account_id: s(normalizedAccount?.account_id).trim(),
    login_id: s(normalizedAccount?.login_id).trim(),
    role: s(normalizedAccount?.role).trim(),
    student_id: s(normalizedAccount?.student_id).trim(),
    branch_id: resolveAccountBranchId(normalizedAccount),
    name: s(normalizedAccount?.name).trim(),
  };
}

function persistAccountSession(account: Account) {
  const normalizedAccount = normalizeAccountRecord(account);

  if (!normalizedAccount || typeof window === "undefined") {
    return;
  }

  try {
    sessionStorage.setItem(PORTAL_ACCOUNT_SESSION_KEY, JSON.stringify(buildAccountSession(normalizedAccount)));
    sessionStorage.setItem("portal_login_id", s(normalizedAccount.login_id));
  } catch {}
}

function readStoredAccountSession() {
  try {
    const savedAccountText = sessionStorage.getItem(PORTAL_ACCOUNT_SESSION_KEY);

    if (savedAccountText) {
      return JSON.parse(savedAccountText) as Partial<AccountSession>;
    }

    const legacyLoginId = sessionStorage.getItem("portal_login_id");

    if (legacyLoginId) {
      return {
        login_id: s(legacyLoginId).trim(),
      };
    }
  } catch {}

  return null;
}

function buildAccountFromSession(session: Partial<AccountSession>) {
  const loginId = s(session.login_id).trim();
  const role = s(session.role).trim();

  if (!loginId || !role) {
    return null;
  }

  return normalizeAccountRecord({
    account_id: s(session.account_id).trim(),
    login_id: loginId,
    password_hash: "",
    role,
    student_id: s(session.student_id).trim(),
    branch_id: normalizeBranchId(session.branch_id),
    name: s(session.name).trim(),
    is_active: "true",
  } satisfies Account);
}

function findAccountInCollection(accounts: Account[], account: Account | null) {
  const normalizedAccount = normalizeAccountRecord(account);

  if (!normalizedAccount) {
    return null;
  }

  const normalizedAccountId = s(normalizedAccount.account_id).trim();
  const normalizedLoginId = s(normalizedAccount.login_id).trim();

  return (
    accounts.find((candidate) => {
      const normalizedCandidate = normalizeAccountRecord(candidate);

      if (!normalizedCandidate) {
        return false;
      }

      if (normalizedAccountId && s(normalizedCandidate.account_id).trim() === normalizedAccountId) {
        return true;
      }

      return normalizedLoginId !== "" && s(normalizedCandidate.login_id).trim() === normalizedLoginId;
    }) || null
  );
}

function hydrateAccountBranchId(account: Account | null, accounts: Account[]) {
  const normalizedAccount = normalizeAccountRecord(account);

  if (!normalizedAccount) {
    return null;
  }

  const matchedAccount = findAccountInCollection(accounts, normalizedAccount);
  const hydratedAccount = normalizeAccountRecord(matchedAccount || normalizedAccount);

  if (!hydratedAccount) {
    return null;
  }

  return {
    ...hydratedAccount,
    branch_id: resolveAccountBranchId(hydratedAccount, normalizedAccount.branch_id),
  } satisfies Account;
}

function isSameAccount(left: Account | null, right: Account | null) {
  const normalizedLeft = normalizeAccountRecord(left);
  const normalizedRight = normalizeAccountRecord(right);
  const accountComparisonKeys = ["account_id", "login_id", "role", "student_id", "branch_id", "name"] as const;

  if (!normalizedLeft || !normalizedRight) {
    return normalizedLeft === normalizedRight;
  }

  return accountComparisonKeys.every(
    (key) => s(normalizedLeft[key]).trim() === s(normalizedRight[key]).trim()
  );
}

function buildPortalDataUrl(account?: Account | null) {
  const params = new URLSearchParams();
  const normalizedAccount = normalizeAccountRecord(account);

  if (normalizedAccount) {
    const role = normalizeRole(normalizedAccount.role);
    const branchId = resolveAccountBranchId(normalizedAccount);

    params.set("role", role);
    params.set("branch_id", branchId);
    params.set("student_id", s(normalizedAccount.student_id).trim());

    if (role === "student") {
      params.set("login_id", s(normalizedAccount.login_id).trim());
      params.set("account_name", s(normalizedAccount.name).trim());
    }
  }

  return `/api/portal-data?${params.toString()}`;
}

function buildPortalDetailUrl(studentId: string, account?: Account | null, fallbackBranchId?: string) {
  const normalizedStudentId = normalizeStudentId(studentId);
  const params = new URLSearchParams();
  const normalizedAccount = normalizeAccountRecord(account);

  if (normalizedAccount) {
    params.set("role", normalizeRole(normalizedAccount.role));
    params.set("branch_id", resolveAccountBranchId(normalizedAccount, fallbackBranchId));
  }

  params.set("student_id", normalizedStudentId);

  return `/api/portal-data/details?${params.toString()}`;
}

function isTruthy(value: unknown) {
  const normalized = s(value).trim();
  if (normalized === "") {
    return true;
  }
  return /^(true|1|y|yes)$/i.test(normalized);
}

function normalizeStudentLoginStatus(value: unknown) {
  const normalized = s(value).trim().toLowerCase();

  if (!normalized) {
    return "active";
  }

  return /^(inactive|false|0|n|no)$/i.test(normalized) ? "inactive" : "active";
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

function buildStudentSheetRow(
  student: Student & { loginStatus?: string; login_status?: string },
  existingStudent?: Student | null
) {
  const now = new Date().toISOString();
  const loginStatus = normalizeStudentLoginStatus(student.loginStatus ?? student.login_status);

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
    status: s(student.status).trim() || "등록",
    memo: s(student.memo).trim(),
    exam_id: s(student.exam_id).trim(),
    login_status: loginStatus,
    created_at: s(existingStudent?.created_at).trim() || now,
    updated_at: now,
  };
}

type StudentListItem = Student & {
  id?: string | number;
  account_id?: string | number;
};

type StudentWithExamScores = Student & {
  exam_scores?: Record<string, Partial<Student>>;
};

function getStudentPreferredSelectionId(student: Student | null | undefined) {
  const candidate = student as StudentListItem | null | undefined;

  try {
    return normalizeStudentId(candidate?.student_id ?? candidate?.id ?? candidate?.account_id ?? "");
  } catch {
    return "";
  }
}

function isValidStudentRecord(student: Student | null | undefined) {
  return !!s(student?.student_id).trim() && !!s(student?.name).trim();
}

function matchesStudentSelection(student: Student | null | undefined, selectionId: string | null | undefined) {
  const candidate = student as StudentListItem | null | undefined;
  let normalizedSelectionId = "";

  try {
    normalizedSelectionId = normalizeStudentId(selectionId);
  } catch {
    normalizedSelectionId = "";
  }

  if (!normalizedSelectionId || !candidate) {
    return false;
  }

  try {
    return normalizeStudentId(candidate.student_id ?? candidate.id ?? candidate.account_id ?? "") === normalizedSelectionId;
  } catch {
    return false;
  }
}

function dedupeStudents(students: Student[]) {
  const uniqueStudents = new Map<string, Student>();

  students.filter(isValidStudentRecord).forEach((student, index) => {
    const dedupeKey =
      getStudentPreferredSelectionId(student) ||
      `${s(student.name).trim()}-${s(student.phone).trim()}-${s(student.branch_id).trim()}-${index}`;
    const existingStudent = uniqueStudents.get(dedupeKey);

    if (!existingStudent) {
      uniqueStudents.set(dedupeKey, student);
      return;
    }

    if (s(student.updated_at).trim().localeCompare(s(existingStudent.updated_at).trim()) > 0) {
      uniqueStudents.set(dedupeKey, student);
    }
  });

  return Array.from(uniqueStudents.values());
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
  const validStudents = students.filter(isValidStudentRecord);
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

  const mergedStudents = validStudents.map((student) => {
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

    const mergedStudent: StudentWithExamScores = {
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

    mergedStudent.exam_scores = examScores;
    return mergedStudent;
  });

  return dedupeStudents(mergedStudents);
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
  const normalizedStatus = s(status).trim();

  if (normalizedStatus === "등록") {
    return {
      background: "rgba(30, 64, 175, 0.12)",
      color: "#1e3a8a",
      border: "1px solid rgba(37, 99, 235, 0.18)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.65)",
    };
  }

  if (normalizedStatus === "휴원") {
    return {
      background: "rgba(245, 158, 11, 0.14)",
      color: "#9a6700",
      border: "1px solid rgba(245, 158, 11, 0.18)",
    };
  }

  if (normalizedStatus === "졸업") {
    return {
      background: "rgba(15, 118, 110, 0.12)",
      color: "#0f766e",
      border: "1px solid rgba(20, 184, 166, 0.18)",
    };
  }

  if (normalizedStatus === "퇴원") {
    return {
      background: "rgba(220, 38, 38, 0.12)",
      color: "#b42318",
      border: "1px solid rgba(220, 38, 38, 0.18)",
    };
  }

  if (normalizedStatus.toLowerCase() === "active") {
    return {
      background: "rgba(21, 128, 61, 0.12)",
      color: "#166534",
      border: "1px solid rgba(34, 197, 94, 0.18)",
    };
  }

  return {
    background: "rgba(148, 163, 184, 0.12)",
    color: "#52607a",
    border: "1px solid rgba(180, 192, 208, 0.26)",
  };
}

function getGradeBadgeStyle(grade: string | number | undefined): React.CSSProperties {
  const g = Number(grade || 0);
  if (g === 1 || g === 2) return { background: "#dcfce7", color: "#166534" };
  if (g === 3 || g === 4) return { background: "#dbeafe", color: "#1d4ed8" };
  if (g === 5 || g === 6) return { background: "#fef3c7", color: "#92400e" };
  return { background: "#fee2e2", color: "#b91c1c" };
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function normalizeBranchLookupValue(value: unknown) {
  return s(value).trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeBranchRecord(branch: Branch): Branch {
  const branchId = s(branch.branch_id).trim() || s(branch.branch_code).trim() || s(branch.branch_name).trim();
  const branchName = s(branch.branch_name).trim() || branchId;
  const branchCode = s(branch.branch_code).trim();

  return {
    ...branch,
    branch_id: branchId,
    branch_name: branchName,
    branch_code: branchCode || undefined,
  };
}

function normalizeBranches(branches: Branch[]) {
  const uniqueBranches = new Map<string, Branch>();

  branches.forEach((branch) => {
    const normalizedBranch = normalizeBranchRecord(branch);

    if (!normalizedBranch.branch_id || uniqueBranches.has(normalizedBranch.branch_id)) {
      return;
    }

    uniqueBranches.set(normalizedBranch.branch_id, normalizedBranch);
  });

  return Array.from(uniqueBranches.values());
}

function resolveBranchId(branches: Branch[], candidate: unknown) {
  const rawCandidate = s(candidate).trim();
  const normalizedCandidate = normalizeBranchLookupValue(rawCandidate);

  if (!normalizedCandidate) {
    return "";
  }

  const matchedBranch = branches.find((branch) => {
    return [branch.branch_id, branch.branch_code, branch.branch_name]
      .map(normalizeBranchLookupValue)
      .includes(normalizedCandidate);
  });

  return matchedBranch ? s(matchedBranch.branch_id).trim() : rawCandidate;
}

function findStudentForAccount(students: Student[], account: Account | null) {
  if (!account) {
    return null;
  }

  const normalizedStudentId = normalizeCompareText(s(account.student_id).trim());

  if (normalizedStudentId) {
    const matchedByStudentId = students.find(
      (student) => normalizeCompareText(s(student.student_id).trim()) === normalizedStudentId
    );

    if (matchedByStudentId) {
      return matchedByStudentId;
    }
  }

  const normalizedLoginId = normalizeCompareText(s(account.login_id).trim());

  if (normalizedLoginId) {
    const matchedByStudentNumber = students.find(
      (student) => normalizeCompareText(s(student.student_no).trim()) === normalizedLoginId
    );

    if (matchedByStudentNumber) {
      return matchedByStudentNumber;
    }
  }

  const normalizedName = normalizeCompareText(s(account.name).trim());

  if (!normalizedName) {
    return null;
  }

  const matchedByName = students.filter(
    (student) => normalizeCompareText(s(student.name).trim()) === normalizedName
  );

  return matchedByName.length === 1 ? matchedByName[0] : null;
}

function findAccountForStudent(accounts: Account[], student: Student | null | undefined) {
  if (!student) {
    return null;
  }

  const normalizedStudentId = normalizeCompareText(s(student.student_id).trim());
  const normalizedStudentNo = normalizeCompareText(s(student.student_no).trim());
  const normalizedStudentName = normalizeCompareText(s(student.name).trim());

  const matchedByStudentId = normalizedStudentId
    ? accounts.find(
        (account) =>
          normalizeCompareText(s(account.role).trim()) === "student" &&
          normalizeCompareText(s(account.student_id).trim()) === normalizedStudentId
      )
    : null;

  if (matchedByStudentId) {
    return matchedByStudentId;
  }

  const matchedByLoginId = normalizedStudentNo
    ? accounts.find(
        (account) =>
          normalizeCompareText(s(account.role).trim()) === "student" &&
          normalizeCompareText(s(account.login_id).trim()) === normalizedStudentNo
      )
    : null;

  if (matchedByLoginId) {
    return matchedByLoginId;
  }

  const matchedByName = normalizedStudentName
    ? accounts.filter(
        (account) =>
          normalizeCompareText(s(account.role).trim()) === "student" &&
          normalizeCompareText(s(account.name).trim()) === normalizedStudentName
      )
    : [];

  return matchedByName.length === 1 ? matchedByName[0] : null;
}

function upsertAccountRecord(accounts: Account[], nextAccount: Account) {
  const normalizedNextAccount = normalizeAccountRecord(nextAccount);

  if (!normalizedNextAccount) {
    return accounts;
  }

  const nextAccountId = s(normalizedNextAccount.account_id).trim();
  const nextStudentId = s(normalizedNextAccount.student_id).trim();
  const nextLoginId = s(normalizedNextAccount.login_id).trim();
  let didReplace = false;

  const mergedAccounts = accounts.map((account) => {
    const normalizedAccount = normalizeAccountRecord(account);

    if (!normalizedAccount) {
      return account;
    }

    const isSameAccountId = nextAccountId && s(normalizedAccount.account_id).trim() === nextAccountId;
    const isSameStudentId = nextStudentId && s(normalizedAccount.student_id).trim() === nextStudentId;
    const isSameLoginId = nextLoginId && s(normalizedAccount.login_id).trim() === nextLoginId;

    if (!isSameAccountId && !isSameStudentId && !isSameLoginId) {
      return account;
    }

    didReplace = true;
    return {
      ...normalizedAccount,
      ...normalizedNextAccount,
    } satisfies Account;
  });

  return didReplace ? mergedAccounts : [...mergedAccounts, normalizedNextAccount];
}

function normalizeStudentRecord(student: Student, branches: Branch[]) {
  return {
    ...student,
    branch_id: resolveBranchId(branches, student.branch_id),
    login_status: normalizeStudentLoginStatus(student.login_status),
  };
}

function normalizeBranchScopedRow<T extends { branch_id?: string }>(row: T, branches: Branch[]) {
  return {
    ...row,
    branch_id: resolveBranchId(branches, row.branch_id),
  };
}

function upsertStudentRecord(students: Student[], nextStudent: Student) {
  const nextStudentId = s(nextStudent.student_id).trim();

  if (!nextStudentId) {
    return students;
  }

  const existingIndex = students.findIndex((student) => s(student.student_id).trim() === nextStudentId);

  if (existingIndex === -1) {
    return [nextStudent, ...students];
  }

  return students.map((student, index) => (index === existingIndex ? { ...student, ...nextStudent } : student));
}

function upsertMockScoreRecord(scores: MockScore[], nextScore: MockScore) {
  const nextStudentId = s(nextScore.student_id).trim();
  const nextExamId = s(nextScore.exam_id).trim();

  if (!nextStudentId || !nextExamId) {
    return scores;
  }

  const existingIndex = scores.findIndex(
    (score) => s(score.student_id).trim() === nextStudentId && s(score.exam_id).trim() === nextExamId
  );

  if (existingIndex === -1) {
    return [nextScore, ...scores];
  }

  return scores.map((score, index) => (index === existingIndex ? { ...score, ...nextScore } : score));
}

function upsertPhysicalRecordEntry(records: PhysicalRecord[], nextRecord: PhysicalRecord) {
  const nextStudentId = s(nextRecord.student_id).trim();
  const nextTestId = s(nextRecord.test_id).trim();

  if (!nextStudentId || !nextTestId) {
    return records;
  }

  const existingIndex = records.findIndex(
    (record) => s(record.student_id).trim() === nextStudentId && s(record.test_id).trim() === nextTestId
  );

  if (existingIndex === -1) {
    return [nextRecord, ...records];
  }

  return records.map((record, index) => (index === existingIndex ? { ...record, ...nextRecord } : record));
}

function mergeUniqueRecords<T>(
  existingRecords: T[],
  incomingRecords: T[],
  getKey: (record: T) => string
) {
  const mergedRecords = new Map<string, T>();

  existingRecords.forEach((record) => {
    const key = getKey(record);

    if (key) {
      mergedRecords.set(key, record);
    }
  });

  incomingRecords.forEach((record) => {
    const key = getKey(record);

    if (key) {
      mergedRecords.set(key, record);
    }
  });

  return Array.from(mergedRecords.values());
}

function buildPortalScopeKey(account: Account | null) {
  if (!account) {
    return "";
  }

  return [
    normalizeRole(account.role),
    s(account.branch_id).trim(),
    s(account.student_id).trim(),
    s(account.login_id).trim(),
  ].join(":");
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoadingShell />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const sharedPortalState = usePortalSharedStore();
  const initRef = useRef(false);
  const portalLoadRef = useRef("");
  const latestAccountsRef = useRef<Account[]>([]);
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
  const [loginFilter, setLoginFilter] = useState("ALL");
  const [studentStatusFilter, setStudentStatusFilter] = useState("ALL");
  const [sortType, setSortType] = useState<SortType>("default");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailPopupOpen, setIsDetailPopupOpen] = useState(false);
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [modalInitialExamId, setModalInitialExamId] = useState<string | null>(null);
  const [consultPanelState, setConsultPanelState] = useState<{
    studentId: string;
    studentInfo: ConsultStudentInfo;
    initialConsultType: ConsultType;
  } | null>(null);
  const [consultFilledMap, setConsultFilledMap] = useState<Record<string, ConsultType[]>>({});
  const [saving, setSaving] = useState(false);
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [restoringSession, setRestoringSession] = useState(false);
  const [, setDetailsLoading] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const activeDashboardView: DashboardView = searchParams.get("view") === "branch-analysis" ? "branch-analysis" : "student-management";

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    if (activeDashboardView !== "student-management" && isDetailPopupOpen) {
      setIsDetailPopupOpen(false);
      setDetailStudentId(null);
    }
  }, [activeDashboardView, isDetailPopupOpen]);

  useEffect(() => {
    if (!isDetailPopupOpen && detailStudentId) {
      setDetailStudentId(null);
    }
  }, [detailStudentId, isDetailPopupOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setBranches(sharedPortalState.branches);
    setRawStudents(sharedPortalState.students);
    setMockExams(sharedPortalState.mockExams);
    setMockScores(sharedPortalState.mockScores);
    setPhysicalTests(sharedPortalState.physicalTests.length > 0 ? normalizePhysicalTests(sharedPortalState.physicalTests) : DEFAULT_PHYSICAL_TESTS);
    setPhysicalRecords(sharedPortalState.physicalRecords);

    if (sharedPortalState.accounts.length > 0) {
      setAccounts(sharedPortalState.accounts);
    }
  }, [
    sharedPortalState.accounts,
    sharedPortalState.branches,
    sharedPortalState.hydratedAt,
    sharedPortalState.mockExams,
    sharedPortalState.mockScores,
    sharedPortalState.physicalRecords,
    sharedPortalState.physicalTests,
    sharedPortalState.students,
  ]);

  useEffect(() => {
    latestAccountsRef.current = accounts;
  }, [accounts]);

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
  const matchedCurrentStudent = useMemo(() => findStudentForAccount(students, currentAccount), [currentAccount, students]);
  const currentStudentId = s(matchedCurrentStudent?.student_id).trim() || s(currentAccount?.student_id).trim();
  const currentBranchId = useMemo(
    () => resolveBranchId(branches, matchedCurrentStudent?.branch_id || currentAccount?.branch_id),
    [branches, currentAccount?.branch_id, matchedCurrentStudent?.branch_id]
  );
  const isSuperAdmin = currentRole === "super_admin";
  const isBranchManager = currentRole === "branch_manager";
  const isStudentRole = currentRole === "student";
  const canManageStudents = isSuperAdmin || isBranchManager;
  const portalScopeKey = useMemo(() => buildPortalScopeKey(currentAccount), [currentAccount]);

  const getBranchLabel = (branchId: string | undefined) => {
    const resolvedBranchId = resolveBranchId(branches, branchId);
    const found = branches.find((branch) => s(branch.branch_id).trim() === resolvedBranchId);
    return found ? s(found.branch_name).trim() : s(branchId).trim() || "-";
  };

  const clearLocalPortalDetails = useCallback(() => {
    setMockExams([]);
    setMockScores([]);
    setPhysicalTests(DEFAULT_PHYSICAL_TESTS);
    setPhysicalRecords([]);
  }, []);

  const clearPortalState = useCallback(() => {
    setRawStudents([]);
    setBranches([]);
    setAccounts([]);
    setConsultFilledMap({});
    clearLocalPortalDetails();
    setSelectedStudentId(null);
    resetPortalSharedStore();
  }, [clearLocalPortalDetails]);

  const loadAccounts = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "GET",
        cache: "no-store",
      });
      const result = await safeJson(res);

      if (!res.ok || result.success === false) {
        const message = s(result.error).trim() || "계정 정보를 불러오지 못했습니다.";
        setAccounts([]);
        setFeedback({ type: "error", message });
        return { ok: false, error: message };
      }

      const nextAccounts = Array.isArray(result.accounts)
        ? (result.accounts as Account[]).flatMap((account) => {
            const normalizedAccount = normalizeAccountRecord(account);
            return normalizedAccount ? [normalizedAccount] : [];
          })
        : [];
      setAccounts(nextAccounts);

      if (process.env.NODE_ENV === "development") {
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

      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, "계정 정보를 불러오지 못했습니다.");
      setAccounts([]);
      setFeedback({ type: "error", message });
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPortalData = useCallback(async ({
    account,
    focusStudentId,
  }: {
    account: Account;
    focusStudentId?: string;
  }) => {
    const resolvedAccount = hydrateAccountBranchId(account, accounts);

    if (!resolvedAccount) {
      return { ok: false, error: "계정 정보를 확인할 수 없습니다." };
    }

    if (!isSameAccount(account, resolvedAccount)) {
      setCurrentAccount(resolvedAccount);
      persistAccountSession(resolvedAccount);
    }

    if (normalizeRole(resolvedAccount.role) === "student" && !resolveAccountBranchId(resolvedAccount)) {
      return { ok: false, error: "student 계정의 branch_id가 없습니다." };
    }

    setLoading(true);
    clearLocalPortalDetails();

    try {
      const lightData = await ensurePortalSharedLightData(async () => {
        const res = await fetch(buildPortalDataUrl(resolvedAccount), {
          method: "GET",
          cache: "no-store",
        });
        const result = await safeJson(res);

        if (!res.ok || result.success === false) {
          throw new Error(s(result.error).trim() || "포털 데이터를 불러오지 못했습니다.");
        }

        const nextBranches = normalizeBranches(Array.isArray(result.branches) ? (result.branches as Branch[]) : []);
        const nextStudents = Array.isArray(result.students)
          ? (result.students as Student[]).map((student) => normalizeStudentRecord(student, nextBranches))
          : [];

        if (process.env.NODE_ENV === "development") {
          console.log("[portal-data-counts]", {
            role: normalizeRole(resolvedAccount.role),
            branchCount: nextBranches.length,
            studentCount: nextStudents.length,
          });
        }

        return {
          branches: nextBranches,
          students: nextStudents.filter(isValidStudentRecord),
          mockExams: Array.isArray(result.mockExams) ? (result.mockExams as MockExam[]) : [],
          mockScores: Array.isArray(result.mockScores)
            ? (result.mockScores as MockScore[]).map((score) => normalizeBranchScopedRow(score, nextBranches))
            : [],
          physicalTests: normalizePhysicalTests(
            Array.isArray(result.physicalTests) && result.physicalTests.length > 0
              ? (result.physicalTests as PhysicalTest[])
              : DEFAULT_PHYSICAL_TESTS
          ),
          physicalRecords: Array.isArray(result.physicalRecords)
            ? (result.physicalRecords as PhysicalRecord[]).map((record) => normalizeBranchScopedRow(record, nextBranches))
            : [],
        };
      });

      setBranches(lightData.branches);
      setRawStudents(lightData.students);
      setMockExams(lightData.mockExams || []);
      setMockScores(lightData.mockScores || []);
      setPhysicalTests(lightData.physicalTests && lightData.physicalTests.length > 0 ? normalizePhysicalTests(lightData.physicalTests) : DEFAULT_PHYSICAL_TESTS);
      setPhysicalRecords(lightData.physicalRecords || []);
      setSelectedStudentId((prev) => {
        if (focusStudentId && lightData.students.some((st) => s(st.student_id).trim() === s(focusStudentId).trim())) {
          return focusStudentId;
        }
        if (prev && lightData.students.some((st) => s(st.student_id).trim() === s(prev).trim())) {
          return prev;
        }

        const firstValidStudent = lightData.students.find(isValidStudentRecord);
        return firstValidStudent ? getStudentPreferredSelectionId(firstValidStudent) : null;
      });

      return { ok: true };
    } catch (error) {
      const message = getErrorMessage(error, "포털 데이터를 불러오지 못했습니다.");
      clearPortalState();
      setFeedback({ type: "error", message });
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [accounts, clearLocalPortalDetails, clearPortalState]);

  useEffect(() => {
    if (initRef.current) {
      return;
    }

    initRef.current = true;

    const savedAccount = readStoredAccountSession();
    const restoredAccount = savedAccount ? buildAccountFromSession(savedAccount) : null;

    if (restoredAccount) {
      setRestoringSession(true);
      setCurrentAccount(restoredAccount);
      return;
    }

    void loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (!currentAccount || !portalScopeKey) {
      return;
    }

    if (portalLoadRef.current === portalScopeKey && (sharedPortalState.isLoaded || sharedPortalState.isLoading)) {
      return;
    }

    portalLoadRef.current = portalScopeKey;

    let cancelled = false;

    const loadScopedPortalData = async () => {
      const result = await loadPortalData({
        account: currentAccount,
        focusStudentId: s(currentAccount.student_id).trim() || undefined,
      });

      if (cancelled) {
        return;
      }

      if (result?.ok === false && restoringSession) {
        setRestoringSession(false);
        setCurrentAccount(null);
        void loadAccounts();
        return;
      }

      if (restoringSession) {
        setRestoringSession(false);
      }
    };

    loadScopedPortalData();

    return () => {
      cancelled = true;
    };
  }, [currentAccount, loadAccounts, loadPortalData, portalScopeKey, restoringSession, sharedPortalState.isLoaded, sharedPortalState.isLoading]);

  useEffect(() => {
    syncPortalSharedCurrentAccount(currentAccount);
  }, [currentAccount]);

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }

    const savedAccount = readStoredAccountSession();
    const savedAccountId = s(savedAccount?.account_id).trim();
    const savedLoginId = s(savedAccount?.login_id).trim();

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
      const hydratedAccount = hydrateAccountBranchId(matchedAccount, accounts);

      if (hydratedAccount) {
        setCurrentAccount(hydratedAccount);
        persistAccountSession(hydratedAccount);
      }
    }
  }, [accounts]);

  useEffect(() => {
    if (!currentAccount || accounts.length === 0) {
      return;
    }

    const hydratedAccount = hydrateAccountBranchId(currentAccount, accounts);

    if (hydratedAccount && !isSameAccount(currentAccount, hydratedAccount)) {
      setCurrentAccount(hydratedAccount);
      persistAccountSession(hydratedAccount);
    }
  }, [accounts, currentAccount]);

  useEffect(() => {
    if (!currentAccount) {
      return;
    }

    if (currentBranchId) {
      setBranchFilter(currentBranchId);
    }

    if (currentStudentId) {
      setSelectedStudentId(currentStudentId);
    }
  }, [currentAccount, currentBranchId, currentStudentId]);

  const scopedStudents = useMemo(() => {
    if (!currentAccount) {
      return students.filter(isValidStudentRecord);
    }

    if (isSuperAdmin) {
      return students.filter(isValidStudentRecord);
    }

    if (isBranchManager) {
      return students.filter((student) => isValidStudentRecord(student) && s(student.branch_id).trim() === currentBranchId);
    }

    if (isStudentRole) {
      return students.filter((student) => isValidStudentRecord(student) && s(student.student_id).trim() === currentStudentId);
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

  const canAccessStudentRecord = useCallback((student: Student | null | undefined) => {
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
  }, [currentBranchId, currentStudentId, isBranchManager, isStudentRole, isSuperAdmin]);

  const blockUnauthorizedAction = (message: string) => {
    setFeedback({ type: "error", message });
  };

  const branchOptions = useMemo(
    () => (isSuperAdmin ? ["ALL", ...scopedBranches.map((b) => s(b.branch_id)).filter(Boolean)] : scopedBranches.map((b) => s(b.branch_id)).filter(Boolean)),
    [isSuperAdmin, scopedBranches]
  );

  const filteredStudents = useMemo(() => {
    const keyword = search.trim();

    const filtered = scopedStudents.filter((st) => {
      if (!isValidStudentRecord(st)) {
        return false;
      }

      const matchesSearch =
        keyword === "" ||
        s(st.name).includes(keyword) ||
        s(st.school_name).includes(keyword) ||
        s(st.student_no).includes(keyword);

      const matchesBranch = branchFilter === "ALL" || s(st.branch_id) === branchFilter;
      const matchedAccount = findAccountForStudent(accounts, st);
      const loginValue = normalizeStudentLoginStatus(st.login_status || matchedAccount?.is_active);
      const studentStatusValue = s(st.status).trim();
      const matchesLogin = loginFilter === "ALL" || loginValue === normalizeStudentLoginStatus(loginFilter);
      const matchesStudentStatus = studentStatusFilter === "ALL" || studentStatusValue === studentStatusFilter;
      return matchesSearch && matchesBranch && matchesLogin && matchesStudentStatus;
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

    return dedupeStudents(sorted);
  }, [accounts, branchFilter, loginFilter, scopedStudents, search, sortType, studentStatusFilter]);

  const consultPrefetchStudentIds = useMemo(
    () =>
      filteredStudents
        .slice(0, 30)
        .map((student) => s(student.student_id).trim())
        .filter(Boolean),
    [filteredStudents]
  );

  const getStudentLoginStatus = useCallback(
    (student: Student) => {
      const matchedAccount = findAccountForStudent(accounts, student);
      return normalizeStudentLoginStatus(student.login_status || matchedAccount?.is_active);
    },
    [accounts]
  );

  const dashboardBaseStudents = useMemo(() => dedupeStudents(scopedStudents.filter(isValidStudentRecord)), [scopedStudents]);

  const selectedStudent = useMemo(() => {
    const matchedFilteredStudent = filteredStudents.find((st) => matchesStudentSelection(st, selectedStudentId)) || null;

    if (matchedFilteredStudent) {
      return matchedFilteredStudent;
    }

    if (!isStudentRole && filteredStudents.length > 0) {
      return filteredStudents[0];
    }

    return scopedStudents.find((st) => matchesStudentSelection(st, selectedStudentId)) || null;
  }, [filteredStudents, isStudentRole, scopedStudents, selectedStudentId]);

  const dashboardStudent = useMemo(() => {
    if (selectedStudent) {
      return selectedStudent;
    }

    if (isStudentRole) {
      return scopedStudents[0] || matchedCurrentStudent || null;
    }

    return null;
  }, [isStudentRole, matchedCurrentStudent, scopedStudents, selectedStudent]);

  const detailPopupStudent = useMemo(() => {
    if (!detailStudentId) {
      return null;
    }

    return (
      filteredStudents.find((student) => matchesStudentSelection(student, detailStudentId)) ||
      scopedStudents.find((student) => matchesStudentSelection(student, detailStudentId)) ||
      students.find((student) => matchesStudentSelection(student, detailStudentId)) ||
      null
    );
  }, [detailStudentId, filteredStudents, scopedStudents, students]);

  const selectedStudentMockChartData = useMemo<StudentMockChartPoint[]>(() => {
    const targetStudentId = s((isStudentRole ? dashboardStudent : selectedStudent)?.student_id).trim();

    if (!targetStudentId) {
      return [];
    }

    return getStudentMockChartData({
      studentId: targetStudentId,
      mockScores: scopedMockScores,
      mockExams,
      debug: false,
    });
  }, [dashboardStudent, isStudentRole, mockExams, scopedMockScores, selectedStudent]);

  const selectedStudentMockScores = useMemo<MockScore[]>(() => {
    const targetStudentId = s((isStudentRole ? dashboardStudent : selectedStudent)?.student_id).trim();

    if (!targetStudentId) {
      return [];
    }

    return scopedMockScores.filter((score) => s(score.student_id).trim() === targetStudentId);
  }, [dashboardStudent, isStudentRole, scopedMockScores, selectedStudent]);

  const selectedStudentPhysicalChartData = useMemo<StudentPhysicalChartPoint[]>(() => {
    const targetStudentId = s((isStudentRole ? dashboardStudent : selectedStudent)?.student_id).trim();

    if (!targetStudentId) {
      return [];
    }

    return getStudentPhysicalChartData({
      studentId: targetStudentId,
      physicalRecords: scopedPhysicalRecords,
      physicalTests,
      debug: false,
    });
  }, [dashboardStudent, isStudentRole, physicalTests, scopedPhysicalRecords, selectedStudent]);

  const detailStudentMockChartData = useMemo<StudentMockChartPoint[]>(() => {
    const targetStudentId = s(detailPopupStudent?.student_id).trim();

    if (!targetStudentId) {
      return [];
    }

    return getStudentMockChartData({
      studentId: targetStudentId,
      mockScores: scopedMockScores,
      mockExams,
      debug: false,
    });
  }, [detailPopupStudent, mockExams, scopedMockScores]);

  const detailStudentMockScores = useMemo<MockScore[]>(() => {
    const targetStudentId = s(detailPopupStudent?.student_id).trim();

    if (!targetStudentId) {
      return [];
    }

    return scopedMockScores.filter((score) => s(score.student_id).trim() === targetStudentId);
  }, [detailPopupStudent, scopedMockScores]);

  const detailStudentPhysicalChartData = useMemo<StudentPhysicalChartPoint[]>(() => {
    const targetStudentId = s(detailPopupStudent?.student_id).trim();

    if (!targetStudentId) {
      return [];
    }

    return getStudentPhysicalChartData({
      studentId: targetStudentId,
      physicalRecords: scopedPhysicalRecords,
      physicalTests,
      debug: false,
    });
  }, [detailPopupStudent, physicalTests, scopedPhysicalRecords]);

  const summary = useMemo(() => {
    if (dashboardBaseStudents.length === 0) return { count: 0, avgScore: "0.0", topAvg: "0.0", activeCount: 0 };
    const avgScore =
      dashboardBaseStudents.reduce((acc, cur) => acc + getAverageNumber(cur), 0) / dashboardBaseStudents.length;
    const topAvg = Math.max(...dashboardBaseStudents.map((st) => getAverageNumber(st)));
    const activeCount = dashboardBaseStudents.filter((st) => s(st.status).toLowerCase() === "active").length;
    return {
      count: dashboardBaseStudents.length,
      avgScore: avgScore.toFixed(1),
      topAvg: topAvg.toFixed(1),
      activeCount,
    };
  }, [dashboardBaseStudents]);

  const quickStats = useMemo(() => {
    const avg80 = dashboardBaseStudents.filter((st) => getAverageNumber(st) >= 80).length;
    const koreanTop = dashboardBaseStudents.filter((st) => {
      const g = Number(st.korean_grade || 0);
      return g === 1 || g === 2;
    }).length;
    const mathTop = dashboardBaseStudents.filter((st) => {
      const g = Number(st.math_grade || 0);
      return g === 1 || g === 2;
    }).length;
    const active = dashboardBaseStudents.filter((st) => s(st.status).toLowerCase() === "active").length;
    return { avg80, koreanTop, mathTop, active };
  }, [dashboardBaseStudents]);

  const selectedIndex = useMemo(
    () => filteredStudents.findIndex((st) => matchesStudentSelection(st, selectedStudentId)),
    [filteredStudents, selectedStudentId]
  );

  const applyStudentDetails = useCallback((details: {
    mockExams: MockExam[];
    mockScores: MockScore[];
    physicalTests: PhysicalTest[];
    physicalRecords: PhysicalRecord[];
  }) => {
    setMockExams((prev) => mergeUniqueRecords(prev, details.mockExams, (exam) => s(exam.exam_id).trim()));
    setMockScores((prev) =>
      mergeUniqueRecords(
        prev,
        details.mockScores.map((score) => normalizeBranchScopedRow(score, branches)),
        (score) => `${s(score.student_id).trim()}:${s(score.exam_id).trim()}`
      )
    );
    setPhysicalTests((prev) =>
      normalizePhysicalTests(mergeUniqueRecords(prev, details.physicalTests, (test) => s(test.test_id).trim()))
    );
    setPhysicalRecords((prev) =>
      mergeUniqueRecords(
        prev,
        details.physicalRecords.map((record) => normalizeBranchScopedRow(record, branches)),
        (record) => `${s(record.student_id).trim()}:${s(record.test_id).trim()}`
      )
    );
  }, [branches]);

  const loadStudentDetails = useCallback(async (studentId: string) => {
    let normalizedStudentId = "";

    try {
      normalizedStudentId = normalizeStudentId(studentId);
    } catch {
      setFeedback({
        type: "error",
        message: "Invalid student_id",
      });
      return null;
    }

    if (!currentAccount) {
      return null;
    }

    const targetStudent =
      scopedStudents.find((student) => s(student.student_id).trim() === normalizedStudentId) ||
      students.find((student) => s(student.student_id).trim() === normalizedStudentId) ||
      null;
    const detailBranchId = resolveBranchId(
      branches,
      resolveAccountBranchId(currentAccount, targetStudent?.branch_id || currentBranchId)
    );

    if (normalizeRole(currentAccount.role) === "student" && !detailBranchId) {
      console.warn("Missing branch_id for student account");
      setFeedback({
        type: "error",
        message: "student 계정의 branch_id가 없어 상세 데이터를 불러올 수 없습니다.",
      });
      return null;
    }

    if (hasPortalSharedStudentDetails(normalizedStudentId)) {
      const cachedDetails = getPortalSharedStudentDetails(normalizedStudentId);

      if (cachedDetails) {
        applyStudentDetails(cachedDetails);
        return cachedDetails;
      }
    }

    setDetailsLoading(true);

    try {
      const details = await ensurePortalSharedStudentDetails(normalizedStudentId, async () => {
        const response = await fetch(buildPortalDetailUrl(normalizedStudentId, currentAccount, detailBranchId), {
          method: "GET",
          cache: "no-store",
        });
        const result = await safeJson(response);

        if (!response.ok || result.success === false) {
          throw new Error(s(result.error).trim() || "상세 데이터를 불러오지 못했습니다.");
        }

        return {
          mockExams: Array.isArray(result.mockExams) ? (result.mockExams as MockExam[]) : [],
          mockScores: Array.isArray(result.mockScores) ? (result.mockScores as MockScore[]) : [],
          physicalTests: normalizePhysicalTests(
            Array.isArray(result.physicalTests) && result.physicalTests.length > 0
              ? (result.physicalTests as PhysicalTest[])
              : DEFAULT_PHYSICAL_TESTS
          ),
          physicalRecords: Array.isArray(result.physicalRecords)
            ? (result.physicalRecords as PhysicalRecord[])
            : [],
        };
      });

      applyStudentDetails(details);
      return details;
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "상세 데이터를 불러오지 못했습니다."),
      });
      return null;
    } finally {
      setDetailsLoading(false);
    }
  }, [applyStudentDetails, branches, currentAccount, currentBranchId, scopedStudents, students]);

  useEffect(() => {
    if (!selectedStudentId && filteredStudents.length > 0) {
      const nextStudentId = getStudentPreferredSelectionId(filteredStudents[0]);
      setSelectedStudentId(nextStudentId);
      if (nextStudentId) {
        void loadStudentDetails(nextStudentId);
      }
      return;
    }

    if (
      selectedStudentId &&
      !filteredStudents.some((st) => matchesStudentSelection(st, selectedStudentId))
    ) {
      const nextStudentId = filteredStudents[0] ? getStudentPreferredSelectionId(filteredStudents[0]) : null;
      setSelectedStudentId(nextStudentId);
      if (nextStudentId) {
        void loadStudentDetails(nextStudentId);
      }
    }
  }, [filteredStudents, loadStudentDetails, selectedStudentId]);

  useEffect(() => {
    if (!isStudentRole || !dashboardStudent) {
      return;
    }

    const dashboardStudentId = s(dashboardStudent.student_id).trim();

    if (!dashboardStudentId) {
      return;
    }

    if (selectedStudentId !== dashboardStudentId) {
      setSelectedStudentId(dashboardStudentId);
    }

    if (!hasPortalSharedStudentDetails(dashboardStudentId)) {
      void loadStudentDetails(dashboardStudentId);
    }
  }, [dashboardStudent, isStudentRole, loadStudentDetails, selectedStudentId]);

  const handleSelectStudent = useCallback((studentId: string) => {
    try {
      const normalizedStudentId = normalizeStudentId(studentId);
      setSelectedStudentId(normalizedStudentId);
      void loadStudentDetails(normalizedStudentId);
    } catch {
      setFeedback({ type: "error", message: "Invalid student_id" });
    }
  }, [loadStudentDetails]);

  const handleOpenDetail = useCallback((studentId?: string | number | null) => {
    const requestedStudentId =
      typeof studentId === "string" || typeof studentId === "number" ? String(studentId) : "";
    let nextStudentId = "";

    try {
      nextStudentId = normalizeStudentId(requestedStudentId || selectedStudentId || "");
    } catch {
      setFeedback({ type: "error", message: "Invalid student_id" });
      return;
    }

    if (!nextStudentId) {
      return;
    }

    setSelectedStudentId(nextStudentId);
    setDetailStudentId(nextStudentId);
    void loadStudentDetails(nextStudentId);
    setIsDetailPopupOpen(true);
  }, [loadStudentDetails, selectedStudentId]);

  const moveSelection = useCallback((direction: "prev" | "next") => {
    if (filteredStudents.length === 0) return;
    if (selectedIndex === -1) {
      const firstStudentId = getStudentPreferredSelectionId(filteredStudents[0]);
      setSelectedStudentId(firstStudentId);
      if (firstStudentId) {
        void loadStudentDetails(firstStudentId);
      }
      return;
    }

    const nextIndex =
      direction === "prev"
        ? Math.max(0, selectedIndex - 1)
        : Math.min(filteredStudents.length - 1, selectedIndex + 1);

    const nextStudentId = getStudentPreferredSelectionId(filteredStudents[nextIndex]);
    setSelectedStudentId(nextStudentId);
    if (nextStudentId) {
      void loadStudentDetails(nextStudentId);
    }
  }, [filteredStudents, loadStudentDetails, selectedIndex]);

  const openAddModal = useCallback(() => {
    if (!canManageStudents) {
      blockUnauthorizedAction("학생 추가 권한이 없습니다.");
      return;
    }

    setModalMode("add");
    setIsModalOpen(true);
  }, [canManageStudents]);

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
      setLoginError("비활성화된 계정입니다.");
      return;
    }

    const nextAccount = hydrateAccountBranchId(matchedAccount, accounts) || normalizeAccountRecord(matchedAccount);

    if (!nextAccount) {
      setLoginError("로그인 계정 정보를 정리하지 못했습니다.");
      return;
    }

    if (normalizeRole(nextAccount.role) === "student" && !resolveAccountBranchId(nextAccount)) {
      console.warn("Missing branch_id for student account");
    }

    setCurrentAccount(nextAccount);
    setLoginError("");
    persistAccountSession(nextAccount);
  };

  const handleLogout = useCallback(() => {
    setCurrentAccount(null);
    setLoginId("");
    setLoginPassword("");
    setLoginError("");
    setBranchFilter("ALL");
    setFeedback(null);
    setIsDetailPopupOpen(false);
    setIsModalOpen(false);
    setSelectedStudentId(null);
    clearLocalPortalDetails();
    portalLoadRef.current = "";

    try {
      sessionStorage.removeItem(PORTAL_ACCOUNT_SESSION_KEY);
      sessionStorage.removeItem("portal_login_id");
    } catch {}

    resetPortalSharedStore();
    void loadAccounts();
  }, [clearLocalPortalDetails, loadAccounts]);

  const handleOpenExamEditor = useCallback(async (studentId: string, examId: string) => {
    if (!canManageStudents) return;
    const normalizedStudentId = normalizeStudentId(studentId);
    setSelectedStudentId(normalizedStudentId);
    await loadStudentDetails(normalizedStudentId);
    setModalInitialExamId(examId);
    setModalMode("edit");
    setIsModalOpen(true);
  }, [canManageStudents, loadStudentDetails]);

  const handleOpenConsultPanel = useCallback((
    studentId: string,
    consultType: string,
    studentInfo: { name: string; branch: string; school: string; grade: string }
  ) => {
    setConsultPanelState({
      studentId,
      studentInfo,
      initialConsultType: resolveConsultType(consultType),
    });
  }, []);

  const handleConsultFilledTypesChange = useCallback((studentId: string, filledTypes: ConsultType[]) => {
    setConsultFilledMap((prev) => ({ ...prev, [studentId]: filledTypes }));
  }, []);

  useEffect(() => {
    if (!canManageStudents || consultPrefetchStudentIds.length === 0) {
      return;
    }

    const missingStudentIds = consultPrefetchStudentIds.filter((studentId) => !(studentId in consultFilledMap));

    if (missingStudentIds.length === 0) {
      return;
    }

    let cancelled = false;

    const loadConsultSummary = async () => {
      try {
        const res = await fetch("/api/consult/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ studentIds: missingStudentIds }),
          cache: "no-store",
        });
        const result = await safeJson(res);

        if (cancelled || !res.ok || result.ok === false) {
          return;
        }

        const nextConsultFilledMap = result.consultFilledMap as Record<string, ConsultType[]> | undefined;

        if (!nextConsultFilledMap) {
          return;
        }

        setConsultFilledMap((prev) => ({
          ...prev,
          ...nextConsultFilledMap,
        }));
      } catch {
        // Keep the table usable even if summary prefetch fails.
      }
    };

    void loadConsultSummary();

    return () => {
      cancelled = true;
    };
  }, [canManageStudents, consultFilledMap, consultPrefetchStudentIds]);

  const openEditModal = useCallback(async () => {
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

    const nextStudentId = getStudentPreferredSelectionId(selectedStudent);

    if (nextStudentId) {
      await loadStudentDetails(nextStudentId);
    }

    setModalMode("edit");
    setIsModalOpen(true);
  }, [canAccessStudentRecord, canManageStudents, loadStudentDetails, selectedStudent]);

  const handleModalSave = async (student: Student & { loginStatus?: string }): Promise<Student | null> => {
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
      setFeedback(null);
      const nextLoginStatus = normalizeCompareText(student.loginStatus) === "inactive" ? "inactive" : "active";
      const existingStudent = rawStudents.find(
        (item) => s(item.student_id).trim() === s(nextStudentInput.student_id).trim()
      );
      const linkedAccount = findAccountForStudent(accounts, existingStudent || selectedStudent || nextStudentInput);

      const nextStudentRow = buildStudentSheetRow(nextStudentInput, existingStudent);

      if (process.env.NODE_ENV === "development") {
        console.info("[handleModalSave] payload", nextStudentRow);
      }

      const saveResult = await saveStudent(nextStudentRow);

      if (saveResult.success !== true && saveResult.ok !== true) {
        const message =
          saveResult.error ||
          ("message" in saveResult && typeof saveResult.message === "string" ? saveResult.message : "") ||
          "학생 저장 중 오류가 발생했습니다.";

        if (process.env.NODE_ENV === "development") {
          console.info("[handleModalSave] failure", {
            student_id: nextStudentRow.student_id,
            name: nextStudentRow.name,
            message,
          });
        }

        setFeedback({ type: "error", message });
        return null;
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[handleModalSave] success", {
          student_id: nextStudentRow.student_id,
          name: nextStudentRow.name,
        });
      }

      const savedStudent = normalizeStudentRecord(
        ({
          ...(((saveResult.data as Student | undefined) || nextStudentRow) as Student),
          login_status: nextLoginStatus,
        } as Student),
        branches
      );

      const normalizedSavedAccount = normalizeAccountRecord(
        (saveResult.account as Account | undefined) ||
          (linkedAccount
            ? {
                ...linkedAccount,
                student_id: s(savedStudent.student_id).trim(),
                branch_id: s(savedStudent.branch_id).trim(),
                name: s(savedStudent.name).trim(),
                is_active: nextLoginStatus === "inactive" ? "FALSE" : "TRUE",
                role: s(linkedAccount.role).trim() || "student",
              }
            : null)
      );

      if (normalizedSavedAccount) {
        const nextAccounts = upsertAccountRecord(latestAccountsRef.current, normalizedSavedAccount);

        latestAccountsRef.current = nextAccounts;
        setAccounts(nextAccounts);
        syncPortalSharedLightData({ accounts: nextAccounts });

        if (currentAccount) {
          const normalizedCurrentAccount = normalizeAccountRecord(currentAccount);
          const sameCurrentAccount =
            normalizedCurrentAccount &&
            ((s(normalizedCurrentAccount.account_id).trim() &&
              s(normalizedCurrentAccount.account_id).trim() === s(normalizedSavedAccount.account_id).trim()) ||
              (s(normalizedCurrentAccount.login_id).trim() &&
                s(normalizedCurrentAccount.login_id).trim() === s(normalizedSavedAccount.login_id).trim()));

          if (sameCurrentAccount) {
            setCurrentAccount(normalizedSavedAccount);
            persistAccountSession(normalizedSavedAccount);
            syncPortalSharedCurrentAccount(normalizedSavedAccount);
          }
        }
      }

      removePortalSharedStudentDetails(s(savedStudent.student_id).trim());
      setRawStudents((prev) => upsertStudentRecord(prev, savedStudent));
      upsertPortalSharedStudent(savedStudent);
      setSelectedStudentId(s(savedStudent.student_id).trim());
      setFeedback({
        type: "success",
        message: modalMode === "add" ? "학생을 추가했습니다." : "학생 정보를 저장했습니다.",
      });

      return savedStudent;
    } catch (error) {
      const message = getErrorMessage(error, "학생 저장 중 오류가 발생했습니다.");
      console.error(error);
      if (process.env.NODE_ENV === "development") {
        console.info("[handleModalSave] failure", {
          student_id: student.student_id,
          name: student.name,
          message,
        });
      }
      setFeedback({ type: "error", message });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleExamScoreSave = async (
    examId: string,
    scores: Partial<Student>,
    targetStudent?: Pick<Student, "student_id" | "name" | "branch_id">,
    options?: SaveHandlerOptions
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

    const incomingExamGroup = resolveExamSaveGroup(s(examId).trim());
    const existingScore = scopedMockScores.find((item) => {
      if (s(item.student_id).trim() !== studentContext.student_id) return false;
      const itemExamId = s(item.exam_id).trim();
      if (itemExamId === s(examId).trim()) return true;
      return incomingExamGroup !== null && resolveExamSaveGroup(itemExamId) === incomingExamGroup;
    });
    const now = new Date().toISOString();
    const resolvedExamId = s(existingScore?.exam_id || examId).trim();
    const nextScoreRow: MockScore = {
      ...existingScore,
      score_id: s(existingScore?.score_id).trim(),
      student_id: studentContext.student_id,
      student_name: studentContext.name,
      branch_id: studentContext.branch_id,
      exam_id: resolvedExamId,
      created_at: s(existingScore?.created_at).trim() || now,
      updated_at: now,
    };

    SCORE_FIELD_KEYS.forEach((fieldName) => {
      nextScoreRow[fieldName] = s(scores[fieldName as keyof Student]).trim();
    });

    await saveMockScore(nextScoreRow);

  removePortalSharedStudentDetails(studentContext.student_id);
    setMockScores((prev) => upsertMockScoreRecord(prev, normalizeBranchScopedRow(nextScoreRow, branches)));

    if (!options?.skipRefresh && !options?.suppressFeedback) {
      setFeedback({
        type: "success",
        message: "시험 성적을 저장했습니다.",
      });
    }
  };

  const handlePhysicalRecordSave = async (record: PhysicalRecord, options?: SaveHandlerOptions) => {
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

    await savePhysicalRecord(nextRecord);

  removePortalSharedStudentDetails(s(nextRecord.student_id).trim());
    setPhysicalRecords((prev) => upsertPhysicalRecordEntry(prev, normalizeBranchScopedRow(nextRecord, branches)));

    if (!options?.skipRefresh && !options?.suppressFeedback) {
      setFeedback({
        type: "success",
        message: "실기 기록을 저장했습니다.",
      });
    }
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

    if (!selectedStudent) {
      blockUnauthorizedAction("삭제할 학생을 먼저 선택하세요.");
      return;
    }

    const confirmed = window.confirm(`${s(selectedStudent.name)} 학생을 삭제하시겠습니까?`);
    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const deletedStudentId = s(selectedStudent.student_id).trim();
      const result = await deleteStudentRecord(deletedStudentId);

      if (!result.ok) {
        throw new Error(result.error || "학생 삭제에 실패했습니다.");
      }

      const remainingStudents = rawStudents.filter(
        (student) => s(student.student_id).trim() !== deletedStudentId
      );
      const nextSelectedStudent = remainingStudents.find((student) => canAccessStudentRecord(student)) || null;

      setRawStudents(remainingStudents);
  removePortalSharedStudentDetails(deletedStudentId);
      removePortalSharedStudent(deletedStudentId);
      setMockScores((prev) => prev.filter((score) => s(score.student_id).trim() !== deletedStudentId));
      setPhysicalRecords((prev) => prev.filter((record) => s(record.student_id).trim() !== deletedStudentId));
      setSelectedStudentId(nextSelectedStudent ? getStudentPreferredSelectionId(nextSelectedStudent) : null);
      setFeedback({
        type: "success",
        message: "학생을 삭제했습니다.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: getErrorMessage(error, "학생 삭제 중 오류가 발생했습니다."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintSelected = useCallback(() => {
    const printTargetStudent = detailPopupStudent || selectedStudent;
    const printMockScores = detailPopupStudent ? detailStudentMockScores : selectedStudentMockScores;
    const printMockChartData = detailPopupStudent ? detailStudentMockChartData : selectedStudentMockChartData;
    const printPhysicalChartData = detailPopupStudent ? detailStudentPhysicalChartData : selectedStudentPhysicalChartData;

    if (!printTargetStudent) {
      alert("학생을 먼저 선택하세요.");
      return;
    }

    const printWindow = window.open("", "_blank", "width=1280,height=960");

    if (!printWindow) {
      alert("팝업이 차단되어 인쇄 창을 열지 못했습니다.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${s(printTargetStudent.name)} 학생 상세 출력</title></head><body><div id="print-root"></div></body></html>`);
    printWindow.document.close();

    const container = printWindow.document.getElementById("print-root");

    if (!container) {
      printWindow.close();
      return;
    }

    const root = createRoot(container);

    const cleanup = () => {
      try {
        root.unmount();
      } catch {
        // no-op
      }
    };

    const handleAfterPrint = () => {
      cleanup();
      printWindow.removeEventListener("afterprint", handleAfterPrint);
      printWindow.close();
    };

    printWindow.addEventListener("afterprint", handleAfterPrint);
    printWindow.addEventListener("beforeunload", cleanup);

    root.render(
      <PrintStudentDetail
        student={printTargetStudent}
        mockScores={printMockScores}
        mockExams={mockExams}
        mockChartData={printMockChartData}
        physicalChartData={printPhysicalChartData}
        getAverageNumber={getAverageNumber}
        getGradeBadgeStyle={getGradeBadgeStyle}
        getBranchLabel={getBranchLabel}
        s={s}
        onReady={() => {
          printWindow.focus();
          printWindow.print();
        }}
      />
    );
  }, [
    detailPopupStudent,
    detailStudentMockChartData,
    detailStudentMockScores,
    detailStudentPhysicalChartData,
    getAverageNumber,
    getBranchLabel,
    getGradeBadgeStyle,
    mockExams,
    s,
    selectedStudent,
    selectedStudentMockChartData,
    selectedStudentMockScores,
    selectedStudentPhysicalChartData,
  ]);

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
          <div style={styles.loginCard}>
            <div style={styles.loginLogoWrap}>
              <Image
                src="/logo.png"
                alt="FINAL SPORTS ACADEMY"
                width={160}
                height={60}
                priority
                sizes="(max-width: 640px) 130px, 160px"
                style={{ width: "min(164px, 38vw)", maxWidth: 164, minWidth: 130, height: "auto" }}
              />
            </div>
            <div style={styles.loginIntro}>
              <div style={styles.loginBrandTitle}>FINAL SPORTS ACADEMY</div>
              <div style={styles.loginBrandSubtitle}>학생과 관리자 계정을 위한 통합 성적 포털</div>
            </div>
            <h1 style={styles.loginTitle}>로그인</h1>
            <form onSubmit={handleLogin} style={styles.loginForm}>
              <label style={styles.loginLabel}>아이디</label>
              <input value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="아이디" style={styles.loginInput} />
              <label style={{ ...styles.loginLabel, marginTop: 2 }}>패스워드</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="패스워드" style={styles.loginInput} />
              {loginError ? <div style={{ color: portalTheme.colors.dangerText, fontSize: 13 }}>{loginError}</div> : null}
              <button type="submit" style={styles.loginButton}>
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
          <div style={{ maxWidth: 520, margin: "80px auto", background: portalTheme.gradients.card, borderRadius: 20, padding: 28, boxShadow: portalTheme.shadows.cardStrong, border: `1px solid ${portalTheme.colors.line}` }}>
            <p style={styles.badge}>권한 확인 필요</p>
            <h1 style={{ margin: "12px 0 8px", fontSize: 28, color: portalTheme.colors.textStrong }}>접근 불가</h1>
            <p style={{ margin: 0, color: portalTheme.colors.textMuted, fontSize: 14 }}>{accessIssueMessage}</p>
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
    ? "학생"
    : isBranchManager
    ? "지점 관리자"
    : "관리자";
  const dashboardBadge = isStudentRole
    ? "FINAL 학생 포털"
    : activeDashboardView === "branch-analysis"
    ? "메인 / 지점별 비교 분석"
    : "메인 / 지점 학생 관리";
  const dashboardTitle = isStudentRole
    ? "내 성적 대시보드"
    : activeDashboardView === "branch-analysis"
    ? "지점별 비교 분석"
    : "지점 학생 관리";
  const dashboardSubtitle = isStudentRole
    ? "본인 성적과 실기 기록만 조회할 수 있습니다."
    : activeDashboardView === "branch-analysis"
    ? "지점별 TOP 분석, 평균 비교 차트, 요약 카드만 별도 화면으로 분리했습니다."
    : "학생 목록과 필터 중심으로 관리하고, 학생 상세는 학생별 상세보기에서 크게 엽니다.";

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {isStudentRole ? (
          <header style={styles.header}>
            <div style={styles.brandWrap}>
              <div style={styles.brandMark}>FINAL</div>
              <div style={styles.brandTextWrap}>
                <span style={styles.brandSub}>SPORTS ACADEMY</span>
              </div>
            </div>
            <div style={styles.headerActions}>
              <span style={styles.userName}>{s(currentAccount.name) || s(currentAccount.login_id)}</span>
              <span style={styles.headerPillMuted}>{roleTitle}</span>
              <button style={styles.secondaryButton} onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          </header>
        ) : (
          <AdminHeader
            isSuperAdmin={isSuperAdmin}
            actions={
              <>
                <span style={styles.userName}>{s(currentAccount.name) || s(currentAccount.login_id)}</span>
                <span style={styles.headerPillMuted}>{roleTitle}</span>
                <button style={styles.secondaryButton} onClick={handleLogout}>
                  로그아웃
                </button>
              </>
            }
          />
        )}

        {isStudentRole ? (
          <section style={styles.heroIntro}>
            <div style={styles.heroIntroInner}>
              <div style={styles.heroIntroCopy}>
                <p style={styles.badge}>{dashboardBadge}</p>
                <h1 style={styles.title}>{dashboardTitle}</h1>
                <div style={styles.introAccentLine} />
                <p style={styles.subtitle}>{dashboardSubtitle}</p>
              </div>
            </div>
          </section>
        ) : null}

        {isStudentRole ? (
          <StudentDashboard
            feedback={feedback}
            loading={loading}
            student={dashboardStudent}
            mockScores={selectedStudentMockScores}
            mockExams={mockExams}
            mockChartData={selectedStudentMockChartData}
            physicalChartData={selectedStudentPhysicalChartData}
            getAverageNumber={getAverageNumber}
            getGradeBadgeStyle={getGradeBadgeStyle}
            getBranchLabel={getBranchLabel}
            s={s}
          />
        ) : (
          <AdminDashboard
            feedback={feedback}
            loading={loading}
            activeView={activeDashboardView}
            selectedStudent={selectedStudent}
            selectedStudentId={selectedStudentId}
            mockExams={mockExams}
            filteredStudents={filteredStudents}
            scopedBranches={scopedBranches}
            scopedStudents={scopedStudents}
            scopedMockScores={scopedMockScores}
            scopedPhysicalRecords={scopedPhysicalRecords}
            physicalTests={physicalTests}
            branchOptions={branchOptions}
            branchFilter={branchFilter}
            loginFilter={loginFilter}
            studentStatusFilter={studentStatusFilter}
            sortType={sortType}
            searchInput={searchInput}
            summary={summary}
            quickStats={quickStats}
            selectedIndex={selectedIndex}
            canManageStudents={canManageStudents}
            isSuperAdmin={isSuperAdmin}
            onSearchInputChange={setSearchInput}
            onBranchFilterChange={setBranchFilter}
            onLoginFilterChange={setLoginFilter}
            onStudentStatusFilterChange={setStudentStatusFilter}
            onSortTypeChange={(value: string) => setSortType(value as SortType)}
            onSelectStudent={handleSelectStudent}
            onOpenDetail={handleOpenDetail}
            onMoveSelection={moveSelection}
            onPrint={handlePrint}
            onAdd={openAddModal}
            onOpenExamEditor={handleOpenExamEditor}
            onOpenConsultPanel={handleOpenConsultPanel}
            consultFilledMap={consultFilledMap}
            getAverageNumber={getAverageNumber}
            getStudentLoginStatus={getStudentLoginStatus}
            getStatusStyle={getStatusStyle}
            getBranchLabel={getBranchLabel}
            s={s}
          />
        )}
      </div>

      {isDetailPopupOpen && detailPopupStudent && (
        <div style={styles.modalOverlay}>
          <div style={styles.detailPopupBox}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{`${s(detailPopupStudent.name)} 학생 상세`}</h3>
              <button style={styles.closeButton} onClick={() => {
                setIsDetailPopupOpen(false);
                setDetailStudentId(null);
              }}>✕</button>
            </div>
            <StudentDetailPanel
              student={detailPopupStudent}
              mockScores={detailStudentMockScores}
              mockExams={mockExams}
              mockChartData={detailStudentMockChartData}
              physicalChartData={detailStudentPhysicalChartData}
              canManage={canManageStudents}
              sticky={false}
              showActions={false}
              onEdit={() => {
                setIsDetailPopupOpen(false);
                setDetailStudentId(null);
                void openEditModal();
              }}
              onDelete={handleDelete}
              onShowDetail={() => {}} // Already in detail view
              getAverageNumber={getAverageNumber}
              getGradeBadgeStyle={getGradeBadgeStyle}
              getBranchLabel={getBranchLabel}
              s={s}
            />
            <div style={styles.modalFooter}>
              {canManageStudents ? (
                <button
                  style={styles.secondaryButton}
                  onClick={() => {
                    setIsDetailPopupOpen(false);
                    setDetailStudentId(null);
                    void openEditModal();
                  }}
                >
                  수정
                </button>
              ) : null}
              {canManageStudents ? (
                <button style={styles.warningButton} onClick={handleDelete}>
                  삭제
                </button>
              ) : null}
              <button style={styles.navButton} onClick={handlePrintSelected}>
                학생 인쇄
              </button>
              <button style={styles.secondaryButton} onClick={() => {
                setIsDetailPopupOpen(false);
                setDetailStudentId(null);
              }}>
                닫기
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
          initialExamId={modalMode === "edit" ? modalInitialExamId : null}
          initialLoginStatus={modalMode === "edit" && selectedStudent ? getStudentLoginStatus(selectedStudent) : "active"}
          branches={scopedBranches}
          mockExams={mockExams}
          physicalTests={physicalTests}
          physicalRecords={scopedPhysicalRecords}
          saving={saving}
          onClose={() => { setIsModalOpen(false); setModalInitialExamId(null); }}
          onSave={handleModalSave}
          onSaveExamScores={handleExamScoreSave}
          onSavePhysicalRecord={handlePhysicalRecordSave}
        />
      ) : null}

      {consultPanelState && (
        <ConsultPanel
          studentId={consultPanelState.studentId}
          studentInfo={consultPanelState.studentInfo}
          initialConsultType={consultPanelState.initialConsultType}
          onClose={() => setConsultPanelState(null)}
          onFilledTypesChange={handleConsultFilledTypesChange}
        />
      )}
    </main>
  );
}

function HomeLoadingShell() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <AdminHeader isSuperAdmin fallbackActiveKey="student-management" />
        <div style={styles.loadingFallbackCard}>
          <p style={styles.loadingFallbackEyebrow}>FINAL 관리자 시스템</p>
          <h2 style={styles.loadingFallbackTitle}>페이지를 준비하는 중입니다.</h2>
          <p style={styles.loadingFallbackBody}>클라이언트 상태를 확인한 뒤 학생 관리 화면을 불러옵니다.</p>
        </div>
      </div>
    </main>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background: portalTheme.gradients.page,
    padding: portalLayout.pagePadding,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: portalLayout.containerMaxWidth,
    margin: "0 auto",
  },
  loadingFallbackCard: {
    padding: portalLayout.cardPadding,
    borderRadius: "24px",
    background: portalTheme.gradients.card,
    border: `1px solid ${portalTheme.colors.line}`,
    boxShadow: portalTheme.shadows.panel,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  loadingFallbackEyebrow: {
    margin: 0,
    color: portalTheme.colors.primary,
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.12em",
  },
  loadingFallbackTitle: {
    margin: 0,
    color: portalTheme.colors.textStrong,
    fontSize: "clamp(28px, 4vw, 40px)",
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  loadingFallbackBody: {
    margin: 0,
    color: portalTheme.colors.textMuted,
    fontSize: "15px",
    lineHeight: 1.7,
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
    marginBottom: "14px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    padding: "16px max(16px, calc((100vw - 1440px) / 2 + 16px))",
    borderRadius: 0,
    background: "#18467f",
    filter: "none",
    backdropFilter: "none",
    opacity: 1,
    color: "#ffffff",
    border: "none",
    boxShadow: "none",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    minWidth: 0,
  },
  brandMark: {
    color: "#ffffff",
    fontSize: "clamp(26px, 3vw, 38px)",
    fontWeight: 900,
    letterSpacing: "-0.08em",
    lineHeight: 0.9,
  },
  brandTextWrap: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "4px",
  },
  brandSub: {
    color: "rgba(255,255,255,0.94)",
    fontSize: "clamp(16px, 2vw, 24px)",
    fontWeight: 800,
    letterSpacing: "0.08em",
    lineHeight: 1,
    whiteSpace: "nowrap",
  },
  brandAccent: {
    color: "#fca5a5",
    fontSize: "clamp(12px, 1.6vw, 16px)",
    fontWeight: 900,
    letterSpacing: "0.12em",
  },
  navLink: {
    ...portalButtonStyles.primary,
    padding: "10px 16px",
    textDecoration: "none",
    fontSize: "13px",
    whiteSpace: "nowrap",
    borderRadius: "10px",
    boxShadow: "none",
    background: "#b42318",
    filter: "none",
    backdropFilter: "none",
    opacity: 1,
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
    minWidth: 0,
  },
  headerMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  userName: {
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: 800,
  },
  headerPillMuted: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: "999px",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    color: "#eff6ff",
    background: "rgba(255, 255, 255, 0.14)",
    fontSize: "12px",
    fontWeight: 800,
  },
  headerPillSuccess: {
    display: "inline-flex",
    alignItems: "center",
    padding: "5px 10px",
    borderRadius: "999px",
    border: "1px solid rgba(34, 197, 94, 0.18)",
    color: "#dcfce7",
    background: "#1f5b34",
    fontSize: "12px",
    fontWeight: 800,
  },
  headerActionRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  examSelector: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  examLabel: {
    fontSize: "14px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.84)",
  },
  examSelect: {
    padding: "8px 12px",
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    borderRadius: "8px",
    fontSize: "14px",
    background: portalTheme.colors.surfaceCard,
    minWidth: "200px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    borderRadius: portalTheme.radius.pill,
    background: "rgba(37, 99, 235, 0.08)",
    color: portalTheme.colors.primary,
    fontSize: "clamp(12px, 1.4vw, 14px)",
    fontWeight: 900,
    margin: 0,
    border: `1px solid ${portalTheme.colors.lineSoft}`,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  heroIntro: {
    marginBottom: "24px",
    padding: "30px 0 26px 0",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
    filter: "none",
    backdropFilter: "none",
    opacity: 1,
    borderBottom: `1px solid ${portalTheme.colors.lineSoft}`,
  },
  heroIntroInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "14px",
    padding: "2px 2px 0",
    flexWrap: "wrap",
  },
  heroIntroCopy: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "14px",
    maxWidth: "780px",
    flex: "1 1 560px",
  },
  introAccentLine: {
    width: "88px",
    height: "3px",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #2563eb 0%, #d92d20 100%)",
  },
  title: {
    margin: 0,
    fontSize: "clamp(42px, 7vw, 62px)",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
    letterSpacing: "-0.05em",
    textShadow: "none",
    lineHeight: 1.04,
  },
  subtitle: {
    margin: 0,
    color: portalTheme.colors.textPrimary,
    fontSize: "clamp(14px, 2.1vw, 16px)",
    lineHeight: 1.68,
    fontWeight: 500,
    maxWidth: "720px",
  },
  loginCard: {
    maxWidth: 448,
    margin: "76px auto",
    background: portalTheme.gradients.card,
    borderRadius: 24,
    padding: "40px 34px 34px",
    boxShadow: portalTheme.shadows.modal,
    border: `1px solid ${portalTheme.colors.line}`,
  },
  loginLogoWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 18,
  },
  loginIntro: {
    textAlign: "center",
    marginBottom: 18,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  loginBrandTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
    letterSpacing: "0.05em",
  },
  loginBrandSubtitle: {
    fontSize: 13,
    color: portalTheme.colors.textMuted,
    lineHeight: 1.65,
  },
  loginTitle: {
    margin: "0 0 10px 0",
    fontSize: 28,
    color: portalTheme.colors.textStrong,
    textAlign: "center",
  },
  loginForm: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: 20,
  },
  loginLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: portalTheme.colors.textStrong,
  },
  loginInput: {
    width: "100%",
    maxWidth: "100%",
    padding: "13px 14px",
    borderRadius: "12px",
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    fontSize: "14px",
    background: portalTheme.colors.surfaceCardAlt,
    boxShadow: portalTheme.shadows.soft,
    outline: "none",
  },
  loginButton: {
    ...portalButtonStyles.primary,
    width: "100%",
    justifyContent: "center",
    padding: "13px 16px",
    fontSize: "14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    textAlign: "center",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  },
  summaryCard: {
    background: portalTheme.gradients.card,
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: portalTheme.shadows.soft,
    border: `1px solid ${portalTheme.colors.line}`,
  },
  summaryLabel: {
    display: "block",
    fontSize: "13px",
    color: portalTheme.colors.textMuted,
    marginBottom: "10px",
  },
  summaryValue: {
    fontSize: "30px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
  },
  quickStatsWrap: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  quickChip: {
    background: portalTheme.colors.surfaceCard,
    border: `1px solid ${portalTheme.colors.line}`,
    boxShadow: portalTheme.shadows.soft,
    color: portalTheme.colors.textStrong,
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
    background: portalTheme.gradients.card,
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: portalTheme.shadows.soft,
    border: `1px solid ${portalTheme.colors.line}`,
  },
  statsTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
  },
  statsRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 0",
    borderBottom: `1px solid ${portalTheme.colors.lineSoft}`,
    fontSize: "14px",
    color: portalTheme.colors.textPrimary,
  },
  chartGrid: {
    marginBottom: "20px",
  },
  chartPanel: {
    background: portalTheme.gradients.card,
    borderRadius: "18px",
    padding: "18px 20px",
    boxShadow: portalTheme.shadows.soft,
    border: `1px solid ${portalTheme.colors.line}`,
  },
  chartPanelTitle: {
    margin: "0 0 14px 0",
    fontSize: "18px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
  },
  branchChartRow: {
    marginBottom: "12px",
  },
  branchChartLabel: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    color: portalTheme.colors.textPrimary,
    marginBottom: "6px",
  },
  branchChartTrack: {
    width: "100%",
    height: "14px",
    borderRadius: "999px",
    background: portalTheme.colors.lineSoft,
    overflow: "hidden",
  },
  branchChartBar: {
    height: "100%",
    borderRadius: "999px",
    background: "linear-gradient(90deg, #1f6fe5 0%, #6ab7ff 100%)",
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
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    fontSize: "14px",
    background: portalTheme.colors.surfaceCardAlt,
    boxShadow: portalTheme.shadows.soft,
    outline: "none",
  },
  select: {
    minWidth: "170px",
    padding: "12px 14px",
    borderRadius: "12px",
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    fontSize: "14px",
    background: portalTheme.colors.surfaceCard,
    outline: "none",
  },
  chartSection: {
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    padding: "20px",
    boxShadow: portalTheme.shadows.soft,
    marginBottom: "20px",
    border: `1px solid ${portalTheme.colors.line}`,
  },
  chartHeader: {
    marginBottom: "16px",
  },
  chartTitle: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
  },
  chartDesc: {
    margin: 0,
    color: portalTheme.colors.textMuted,
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
    color: portalTheme.colors.textPrimary,
  },
  chartLabel: {
    color: portalTheme.colors.textPrimary,
  },
  chartValue: {
    color: portalTheme.colors.textStrong,
    fontWeight: 800,
  },
  chartTrack: {
    flex: 1,
    height: "18px",
    background: portalTheme.colors.lineSoft,
    borderRadius: "999px",
    overflow: "hidden",
  },
  chartBar: {
    height: "100%",
    borderRadius: "999px",
  },
  koreanBar: {
    background: "linear-gradient(90deg, #1f6fe5 0%, #6ab7ff 100%)",
  },
  mathBar: {
    background: "linear-gradient(90deg, #149b85 0%, #34b87a 100%)",
  },
  englishBar: {
    background: "linear-gradient(90deg, #ff9b54 0%, #ffd089 100%)",
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 2fr) minmax(320px, 1fr)",
    gap: "20px",
    alignItems: "start",
  },
  leftPanel: {
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    padding: "20px",
    boxShadow: portalTheme.shadows.soft,
    border: `1px solid ${portalTheme.colors.line}`,
  },
  stickyActionBar: {
    position: "sticky",
    top: "14px",
    zIndex: 20,
    background: "rgba(255,255,255,0.96)",
    border: `1px solid ${portalTheme.colors.line}`,
    borderRadius: "16px",
    padding: "12px 14px",
    marginBottom: "16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    boxShadow: portalTheme.shadows.soft,
  },
  selectedStudentChip: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: portalTheme.colors.surfacePanel,
    borderRadius: "999px",
    padding: "10px 14px",
  },
  selectedStudentLabel: {
    fontSize: "12px",
    fontWeight: 700,
    color: portalTheme.colors.textMuted,
  },
  selectedStudentText: {
    fontSize: "14px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
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
    color: portalTheme.colors.textStrong,
  },
  panelDesc: {
    margin: 0,
    color: portalTheme.colors.textMuted,
    fontSize: "13px",
  },
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  addButton: {
    ...portalButtonStyles.primary,
    padding: "12px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
  editButton: {
    ...portalButtonStyles.success,
    padding: "12px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
  deleteButton: {
    ...portalButtonStyles.warning,
    padding: "12px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
  navButton: {
    ...portalButtonStyles.secondary,
    padding: "12px 14px",
    fontSize: "14px",
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
    borderBottom: `2px solid ${portalTheme.colors.lineStrong}`,
    background: portalTheme.colors.surfacePanel,
    textAlign: "left",
    fontSize: "14px",
    textShadow: "0 6px 20px rgba(15, 23, 42, 0.25)",
    color: portalTheme.colors.textPrimary,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineSoft}`,
    fontSize: "14px",
    color: portalTheme.colors.textPrimary,
    whiteSpace: "nowrap",
  },
  tdStrong: {
    padding: "14px 12px",
    borderBottom: `1px solid ${portalTheme.colors.lineSoft}`,
    fontSize: "14px",
    fontWeight: 800,
    color: portalTheme.colors.textStrong,
    whiteSpace: "nowrap",
  },
  row: {
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  selectedRow: {
    background: portalTheme.colors.primarySoft,
    boxShadow: `inset 4px 0 0 ${portalTheme.colors.primary}`,
  },
  detailCard: {
    background: portalTheme.gradients.card,
    padding: "24px",
    borderRadius: "20px",
    boxShadow: portalTheme.shadows.soft,
    border: `1px solid ${portalTheme.colors.line}`,
    position: "sticky",
    top: "20px",
  },
  detailPopupBox: {
    width: "min(90vw, 1400px)",
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    padding: "28px",
    boxShadow: portalTheme.shadows.modal,
    border: `1px solid ${portalTheme.colors.line}`,
    height: "90vh",
    overflowY: "auto",
  },
  selectedBadge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: "999px",
    background: portalTheme.colors.primarySoft,
    color: portalTheme.colors.primary,
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "14px",
  },
  detailName: {
    margin: "0 0 8px 0",
    fontSize: "34px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
    letterSpacing: "-0.5px",
  },
  detailSub: {
    margin: "0 0 20px 0",
    color: portalTheme.colors.textMuted,
    fontSize: "14px",
  },
  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  },
  scoreBox: {
    background: portalTheme.colors.surfacePanel,
    borderRadius: "16px",
    padding: "16px",
    minHeight: "98px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    border: `1px solid ${portalTheme.colors.line}`,
  },
  scoreLabel: {
    display: "block",
    fontSize: "12px",
    color: portalTheme.colors.textMuted,
    marginBottom: "8px",
  },
  scoreValue: {
    fontSize: "26px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
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
    borderTop: `1px solid ${portalTheme.colors.line}`,
    borderBottom: `1px solid ${portalTheme.colors.line}`,
    padding: "16px 0",
    marginBottom: "20px",
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "14px",
    marginBottom: "10px",
    color: portalTheme.colors.textPrimary,
  },
  infoTitle: {
    fontWeight: 700,
    color: portalTheme.colors.textMuted,
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
    color: portalTheme.colors.textStrong,
  },
  subjectBox: {
    background: portalTheme.colors.surfacePanel,
    borderRadius: "16px",
    padding: "16px",
    border: `1px solid ${portalTheme.colors.line}`,
  },
  subjectRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    fontSize: "14px",
    color: portalTheme.colors.textPrimary,
    marginBottom: "8px",
  },
  stateBox: {
    background: portalTheme.gradients.card,
    borderRadius: "16px",
    border: `1px solid ${portalTheme.colors.line}`,
    boxShadow: portalTheme.shadows.card,
    padding: "24px",
    fontSize: "14px",
    color: portalTheme.colors.textMuted,
    textAlign: "center",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 30, 58, 0.48)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  modalBox: {
    width: "100%",
    maxWidth: "980px",
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    padding: "24px",
    boxShadow: portalTheme.shadows.modal,
    border: `1px solid ${portalTheme.colors.line}`,
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
    color: portalTheme.colors.textStrong,
  },
  closeButton: {
    border: "none",
    background: portalTheme.colors.surfacePanel,
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 700,
    color: portalTheme.colors.textPrimary,
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
    color: portalTheme.colors.textMuted,
  },
  formInput: {
    padding: "12px 14px",
    borderRadius: "12px",
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    fontSize: "14px",
    outline: "none",
    background: portalTheme.colors.surfaceCard,
  },
  sectionToggle: {
    width: "100%",
    border: `1px solid ${portalTheme.colors.lineStrong}`,
    background: portalTheme.colors.surfacePanel,
    color: portalTheme.colors.textStrong,
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
    paddingTop: "18px",
    borderTop: `1px solid ${portalTheme.colors.line}`,
  },
  secondaryButton: {
    ...portalButtonStyles.secondary,
    padding: "9px 14px",
    fontSize: "12px",
    cursor: "pointer",
    borderRadius: "10px",
    background: "#4b5563",
    border: "1px solid rgba(255,255,255,0.14)",
    color: "#ffffff",
    boxShadow: "none",
    filter: "none",
    backdropFilter: "none",
    opacity: 1,
  },
  warningButton: {
    ...portalButtonStyles.warning,
    padding: "9px 14px",
    fontSize: "12px",
    cursor: "pointer",
    borderRadius: "10px",
  },
  primaryButton: {
    ...portalButtonStyles.primary,
    padding: "12px 16px",
    fontSize: "14px",
    cursor: "pointer",
  },
};
