import type { Branch, MockScore, PhysicalRecord, Student } from "@/lib/dataService";
import { getAllPortalData } from "@/lib/sheets";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = s(searchParams.get("mode")).toLowerCase();
    const role = normalizeRole(searchParams.get("role"));
    const branchId = s(searchParams.get("branch_id"));
    const studentId = s(searchParams.get("student_id"));
    const data = await getAllPortalData();

    if (mode === "auth") {
      return Response.json({
        success: true,
        branches: [],
        accounts: data.accounts,
        students: [],
        mockExams: [],
        mockScores: [],
        physicalTests: [],
        physicalRecords: [],
      });
    }

    if (role === "super_admin") {
      return Response.json({
        success: true,
        branches: data.branches,
        accounts: [],
        students: data.students,
        mockExams: data.mockExams,
        mockScores: data.mockScores,
        physicalTests: data.physicalTests,
        physicalRecords: data.physicalRecords,
      });
    }

    if (role === "branch_manager") {
      const scopedBranches = filterByBranchId(data.branches, branchId);
      const scopedStudents = filterByBranchId(data.students, branchId);
      const scopedMockScores = filterByBranchId<MockScore>(data.mockScores, branchId);
      const scopedPhysicalRecords = filterByBranchId<PhysicalRecord>(data.physicalRecords, branchId);

      return Response.json({
        success: true,
        branches: scopedBranches,
        accounts: [],
        students: scopedStudents,
        mockExams: data.mockExams,
        mockScores: scopedMockScores,
        physicalTests: data.physicalTests,
        physicalRecords: scopedPhysicalRecords,
      });
    }

    if (role === "student") {
      const scopedStudents = filterByStudentId<Student>(data.students, studentId);
      const scopedMockScores = filterByStudentId<MockScore>(data.mockScores, studentId);
      const scopedPhysicalRecords = filterByStudentId<PhysicalRecord>(data.physicalRecords, studentId);
      const scopedBranches = filterBranchesForStudent(data.branches, scopedStudents, branchId);

      return Response.json({
        success: true,
        branches: scopedBranches,
        accounts: [],
        students: scopedStudents,
        mockExams: data.mockExams,
        mockScores: scopedMockScores,
        physicalTests: data.physicalTests,
        physicalRecords: scopedPhysicalRecords,
      });
    }

    return Response.json({
      success: true,
      branches: [],
      accounts: [],
      students: [],
      mockExams: [],
      mockScores: [],
      physicalTests: [],
      physicalRecords: [],
    });
  } catch (error: any) {
    return Response.json(
      {
        success: false,
        error: error?.message || String(error),
        branches: [],
        accounts: [],
        students: [],
        mockExams: [],
        mockScores: [],
        physicalTests: [],
        physicalRecords: [],
      },
      { status: 500 }
    );
  }
}