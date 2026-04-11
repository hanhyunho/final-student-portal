import { getAccountsSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = await getAccountsSheet();

    return Response.json(
      {
        ok: true,
        success: true,
        accounts,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        accounts: [],
      },
      { status: 500 }
    );
  }
}
