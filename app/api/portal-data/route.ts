import { getAllPortalData } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getAllPortalData();

    return Response.json({
      success: true,
      branches: data.branches,
      accounts: data.accounts,
      students: data.students,
      mockExams: data.mockExams,
      mockScores: data.mockScores,
      physicalTests: data.physicalTests,
      physicalRecords: data.physicalRecords,
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