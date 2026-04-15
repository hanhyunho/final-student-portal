import { getUniversityLogosSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

function s(value: unknown) {
  return String(value ?? "").trim();
}

export async function GET() {
  try {
    const rows = await getUniversityLogosSheet();
    const logoMap = rows.reduce<Record<string, string>>((accumulator, row) => {
      const university = s(row.university);
      const logoUrl = s(row.logo_url);

      if (university && logoUrl) {
        accumulator[university] = logoUrl;
      }

      return accumulator;
    }, {});

    return Response.json({
      ok: true,
      success: true,
      logoMap,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        logoMap: {},
      },
      { status: 500 }
    );
  }
}
