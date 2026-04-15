export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwg7vShRN81QwHUBVHd8ZV18MOaptABerhtg-Fvqw2R1isYTl3muP0xGwOXATBEBqwHlg/exec";

const SUMMARY_CACHE_TTL_MS = 30 * 1000;
const summaryCache = new Map<
  string,
  {
    fetchedAt: number;
    data: unknown;
  }
>();

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text?.trim()) return { ok: false, error: "Empty response" };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Invalid JSON: ${text}` };
  }
}

function normalizeStudentIds(input: unknown) {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
    )
  ).sort();
}

function getSummaryCacheKey(studentIds: string[]) {
  return studentIds.join(",");
}

function hasUnsupportedActionError(result: Record<string, unknown>) {
  const errorMessage = String(result.error ?? result.message ?? "").toLowerCase();
  return errorMessage.includes("unsupported") || errorMessage.includes("지원하지 않는 action");
}

async function fetchConsultFilledMapFallback(studentIds: string[]) {
  const consultFilledMap: Record<string, string[]> = {};

  await Promise.all(
    studentIds.map(async (studentId) => {
      const res = await fetch(
        `${APPS_SCRIPT_URL}?action=getConsultRecord&student_id=${encodeURIComponent(studentId)}&all=true&_ts=${Date.now()}`,
        { cache: "no-store" }
      );
      const result = (await safeJson(res)) as {
        ok?: boolean;
        records?: Record<string, { consult_memo?: string }>;
      };

      const records = result.records ?? {};
      consultFilledMap[studentId] = Object.entries(records)
        .filter(([, value]) => String(value?.consult_memo ?? "").trim() !== "")
        .map(([consultType]) => consultType);
    })
  );

  return {
    ok: true,
    success: true,
    consultFilledMap,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const studentIds = normalizeStudentIds(body?.studentIds);

    if (studentIds.length === 0) {
      return Response.json({ ok: true, success: true, consultFilledMap: {} }, { status: 200 });
    }

    const cacheKey = getSummaryCacheKey(studentIds);
    const cached = summaryCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt <= SUMMARY_CACHE_TTL_MS) {
      return Response.json(cached.data, { status: 200 });
    }

    const res = await fetch(
      `${APPS_SCRIPT_URL}?action=getConsultSummary&student_ids=${encodeURIComponent(studentIds.join(","))}&_ts=${Date.now()}`,
      { cache: "no-store" }
    );
    let result = await safeJson(res);

    if (!res.ok || (result.ok === false && hasUnsupportedActionError(result as Record<string, unknown>))) {
      result = await fetchConsultFilledMapFallback(studentIds);
    }

    summaryCache.set(cacheKey, {
      fetchedAt: Date.now(),
      data: result,
    });

    return Response.json(result, { status: 200 });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
