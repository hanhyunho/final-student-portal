import type { MockScore, PhysicalRecord } from "@/lib/dataService";
import {
  getMockExamsSheet,
  getMockScoresSheet,
  getPhysicalRecordsSheet,
  getPhysicalTestsSheet,
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

function isInvalidStudentId(studentId: unknown) {
  if (typeof studentId !== "string") {
    return true;
  }

  const normalizedStudentId = studentId.trim();

  return !normalizedStudentId || normalizedStudentId === "[object Object]";
}

function filterByStudentId<T extends { student_id?: string }>(rows: T[], studentId: string) {
  if (!studentId) {
    return [];
  }

  return rows.filter((row) => s(row.student_id) === studentId);
}

function filterByBranchAndStudentId<T extends { branch_id?: string; student_id?: string }>(
  rows: T[],
  branchId: string,
  studentId: string
) {
  return rows.filter((row) => s(row.student_id) === studentId && (!branchId || s(row.branch_id) === branchId));
}

function filterStudentScopedRows<T extends { branch_id?: string; student_id?: string }>(
  rows: T[],
  branchId: string,
  studentId: string
) {
  const studentMatchedRows = filterByStudentId(rows, studentId);

  if (!branchId) {
    return studentMatchedRows;
  }

  const branchMatchedRows = filterByBranchAndStudentId(rows, branchId, studentId);

  if (branchMatchedRows.length > 0) {
    return branchMatchedRows;
  }

  return studentMatchedRows;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const role = normalizeRole(searchParams.get("role"));
    const branchId = s(searchParams.get("branch_id"));
    const studentIdParam = searchParams.get("student_id");

    if (role === "student" && !branchId) {
      console.warn("Missing branch_id for student account");

      return Response.json(
        {
          ok: false,
          success: false,
          error: "Missing branch_id for student account",
          mockExams: [],
          mockScores: [],
          physicalTests: [],
          physicalRecords: [],
        },
        { status: 400 }
      );
    }

    if (isInvalidStudentId(studentIdParam)) {
      return Response.json(
        {
          ok: false,
          success: false,
          error: "Invalid student_id",
          mockExams: [],
          mockScores: [],
          physicalTests: [],
          physicalRecords: [],
        },
        { status: 400 }
      );
    }

    const studentId = studentIdParam.trim();

    const [mockExams, mockScoreRows, physicalTests, physicalRecordRows] = await Promise.all([
      getMockExamsSheet(),
      getMockScoresSheet(),
      getPhysicalTestsSheet(),
      getPhysicalRecordsSheet(),
    ]);

    if (role === "super_admin") {
      return Response.json({
        ok: true,
        success: true,
        mockExams,
        mockScores: filterByStudentId(mockScoreRows, studentId),
        physicalTests,
        physicalRecords: filterByStudentId(physicalRecordRows, studentId),
      });
    }

    if (role === "branch_manager") {
      return Response.json({
        ok: true,
        success: true,
        mockExams,
        mockScores: filterByBranchAndStudentId(mockScoreRows as MockScore[], branchId, studentId),
        physicalTests,
        physicalRecords: filterByBranchAndStudentId(physicalRecordRows as PhysicalRecord[], branchId, studentId),
      });
    }

    if (role === "student") {
      return Response.json({
        ok: true,
        success: true,
        mockExams,
        mockScores: filterStudentScopedRows(mockScoreRows as MockScore[], branchId, studentId),
        physicalTests,
        physicalRecords: filterStudentScopedRows(physicalRecordRows as PhysicalRecord[], branchId, studentId),
      });
    }

    return Response.json({
      ok: true,
      success: true,
      mockExams: [],
      mockScores: [],
      physicalTests: [],
      physicalRecords: [],
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        mockExams: [],
        mockScores: [],
        physicalTests: [],
        physicalRecords: [],
      },
      { status: 500 }
    );
  }
}