import type { Branch, Student } from "@/lib/dataService";
import {
  getBranchesSheet,
  getStudentsSheet,
} from "@/lib/sheets";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeRole(value: unknown) {
  const normalized = s(value).toLowerCase();

  if (normalized === "super_admin" || normalized === "branch_manager" || normalized === "student") {
    return normalized;
  }

  return "";
}

function normalizeCompareText(value: unknown) {
  return s(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeBranchToken(value: unknown) {
  return s(value).toLowerCase().replace(/\s+/g, " ");
}

function normalizeBranch(branch: Branch): Branch {
  const branchId = s(branch.branch_id) || s(branch.branch_code) || s(branch.branch_name);
  const branchName = s(branch.branch_name) || branchId;
  const branchCode = s(branch.branch_code);

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
    const normalizedBranch = normalizeBranch(branch);
    const branchId = s(normalizedBranch.branch_id);

    if (!branchId || uniqueBranches.has(branchId)) {
      return;
    }

    uniqueBranches.set(branchId, normalizedBranch);
  });

  return Array.from(uniqueBranches.values());
}

function resolveBranchId(branches: Branch[], candidate: unknown) {
  const rawCandidate = s(candidate);
  const normalizedCandidate = normalizeBranchToken(rawCandidate);

  if (!normalizedCandidate) {
    return "";
  }

  const matchedBranch = branches.find((branch) => {
    return [branch.branch_id, branch.branch_code, branch.branch_name]
      .map(normalizeBranchToken)
      .includes(normalizedCandidate);
  });

  return matchedBranch ? s(matchedBranch.branch_id) : rawCandidate;
}

function getRowBranchToken(row: { branch_id?: string }) {
  const source = row as Record<string, unknown>;

  return (
    s(source.branch_id) ||
    s(source.branch_name) ||
    s(source.campus) ||
    s(source.campus_name)
  );
}

function normalizeBranchScopedRows<T extends { branch_id?: string }>(rows: T[], branches: Branch[]) {
  return rows.map((row) => {
    const branchId = resolveBranchId(branches, getRowBranchToken(row));

    if (!branchId) {
      return row;
    }

    return {
      ...row,
      branch_id: branchId,
    };
  });
}

function filterByBranchId<T extends { branch_id?: string }>(rows: T[], branchId: string) {
  if (!branchId) {
    return [];
  }

  return rows.filter((row) => s(row.branch_id) === branchId);
}

function filterByStudentId<T extends { student_id?: string }>(rows: T[], studentId: string) {
  if (!studentId) {
    return [];
  }

  return rows.filter((row) => s(row.student_id) === studentId);
}

function filterBranchesForStudent(branches: Branch[], students: Student[], fallbackBranchId: string) {
  const effectiveBranchId = s(students[0]?.branch_id) || fallbackBranchId;

  if (!effectiveBranchId) {
    return [];
  }

  return branches.filter((branch) => s(branch.branch_id) === effectiveBranchId);
}

function matchesBranchScope(student: Student, branchId: string) {
  return !branchId || s(student.branch_id) === branchId;
}

function resolveStudentForAccount(
  students: Student[],
  options: {
    studentId: string;
    loginId: string;
    accountName: string;
    branchId: string;
  }
) {
  const { studentId, loginId, accountName, branchId } = options;

  const exactStudent = students.find((student) => s(student.student_id) === studentId && matchesBranchScope(student, branchId));

  if (exactStudent) {
    return exactStudent;
  }

  const candidateTokens = [loginId, accountName].map(normalizeCompareText).filter(Boolean);

  if (candidateTokens.length === 0) {
    return null;
  }

  const matchedStudents = students.filter((student) => {
    if (!matchesBranchScope(student, branchId)) {
      return false;
    }

    const studentTokens = [student.student_id, student.student_no, student.name]
      .map(normalizeCompareText)
      .filter(Boolean);

    return candidateTokens.some((token) => studentTokens.includes(token));
  });

  return matchedStudents[0] || null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = normalizeRole(searchParams.get("role"));
    const branchToken = s(searchParams.get("branch_id"));
    const studentId = s(searchParams.get("student_id"));
    const loginId = s(searchParams.get("login_id"));
    const accountName = s(searchParams.get("account_name"));

    const [branchRows, studentRows] = await Promise.all([
      getBranchesSheet(),
      getStudentsSheet(),
    ]);
    const branches = normalizeBranches(branchRows);
    const branchId = resolveBranchId(branches, branchToken);
    const students = normalizeBranchScopedRows<Student>(studentRows, branches);

    if (role === "super_admin") {
      return Response.json({
        ok: true,
        success: true,
        branches,
        students,
      });
    }

    if (role === "branch_manager") {
      const scopedBranches = filterByBranchId(branches, branchId);
      const scopedStudents = filterByBranchId(students, branchId);

      return Response.json({
        ok: true,
        success: true,
        branches: scopedBranches,
        students: scopedStudents,
      });
    }

    if (role === "student") {
      const matchedStudent = resolveStudentForAccount(students, {
        studentId,
        loginId,
        accountName,
        branchId,
      });
      const scopedStudents = matchedStudent ? [matchedStudent] : filterByStudentId<Student>(students, studentId);
      const scopedBranches = filterBranchesForStudent(branches, scopedStudents, branchId);

      return Response.json({
        ok: true,
        success: true,
        branches: scopedBranches,
        students: scopedStudents,
      });
    }

    return Response.json({
      ok: true,
      success: true,
      branches: [],
      students: [],
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        branches: [],
        students: [],
      },
      { status: 500 }
    );
  }
}