export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwg7vShRN81QwHUBVHd8ZV18MOaptABerhtg-Fvqw2R1isYTl3muP0xGwOXATBEBqwHlg/exec";

const CONSULT_CACHE_TTL_MS = 30 * 1000;
const consultCache = new Map<
  string,
  {
    fetchedAt: number;
    data: unknown;
  }
>();
const consultRequestCache = new Map<string, Promise<unknown>>();

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text?.trim()) return { ok: false, error: "Empty response" };
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, error: `Invalid JSON: ${text}` };
  }
}

function getConsultCacheKey(studentId: string, all: string, consultType: string) {
  return `${studentId}:${all}:${consultType}`;
}

function getCachedConsultResponse(key: string) {
  const cached = consultCache.get(key);

  if (!cached) {
    return null;
  }

  if (Date.now() - cached.fetchedAt > CONSULT_CACHE_TTL_MS) {
    consultCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCachedConsultResponse(key: string, data: unknown) {
  consultCache.set(key, {
    fetchedAt: Date.now(),
    data,
  });
}

function invalidateConsultCacheForStudent(studentId: string) {
  for (const key of consultCache.keys()) {
    if (key.startsWith(`${studentId}:`)) {
      consultCache.delete(key);
    }
  }

  for (const key of consultRequestCache.keys()) {
    if (key.startsWith(`${studentId}:`)) {
      consultRequestCache.delete(key);
    }
  }
}

async function fetchConsultResponse(cacheKey: string, url: string) {
  const inFlightRequest = consultRequestCache.get(cacheKey);

  if (inFlightRequest) {
    return inFlightRequest;
  }

  const requestPromise = (async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      const result = await safeJson(res);
      setCachedConsultResponse(cacheKey, result);
      return result;
    } finally {
      consultRequestCache.delete(cacheKey);
    }
  })();

  consultRequestCache.set(cacheKey, requestPromise);
  return requestPromise;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const studentId = url.searchParams.get("student_id") ?? "";
    const all = url.searchParams.get("all") ?? "";
    const consultType = url.searchParams.get("consult_type") ?? "";
    const cacheKey = getConsultCacheKey(studentId, all, consultType);
    const cached = getCachedConsultResponse(cacheKey);

    if (cached) {
      return Response.json(cached, { status: 200 });
    }

    if (all === "true") {
      const result = await fetchConsultResponse(
        cacheKey,
        `${APPS_SCRIPT_URL}?action=getConsultRecord&student_id=${encodeURIComponent(studentId)}&all=true`
      );
      return Response.json(result, { status: 200 });
    }

    const result = await fetchConsultResponse(
      cacheKey,
      `${APPS_SCRIPT_URL}?action=getConsultRecord&student_id=${encodeURIComponent(studentId)}&consult_type=${encodeURIComponent(consultType)}`
    );
    return Response.json(result, { status: 200 });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "saveConsultRecord", row: body }),
      cache: "no-store",
    });

    const result = await safeJson(res);
    invalidateConsultCacheForStudent(String(body?.student_id ?? ""));
    return Response.json(result, { status: result.ok === false ? 500 : 200 });
  } catch (error: unknown) {
    return Response.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
