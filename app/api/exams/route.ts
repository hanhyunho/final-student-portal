export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzMiiF4k6E2VAbLxOHJ39lGrDOv9PP9YnHI7he_Y-xyFtS91E4xjkRZG1vj68BKuPnBBA/exec";

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

async function forwardToAppsScript(action: string, payload: any) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
      cache: "no-store",
    });

    const result = await safeJson(res);
    return result;
  } catch (error: any) {
    return {
      ok: false,
      error: `Apps Script call failed: ${error?.message || String(error)}`,
    };
  }
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
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `Failed to fetch exams: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}