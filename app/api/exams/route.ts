export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwg7vShRN81QwHUBVHd8ZV18MOaptABerhtg-Fvqw2R1isYTl3muP0xGwOXATBEBqwHlg/exec";

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text || !text.trim()) {
    return { ok: false, error: "Empty response from server" };
  }
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Invalid JSON: ${text}` };
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function GET() {
  try {
    const res = await fetch(
      `${APPS_SCRIPT_URL}?action=listExams&_ts=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const result = await safeJson(res);
    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        error: `Failed to fetch exams: ${getErrorMessage(error)}`,
      },
      { status: 500 }
    );
  }
}
