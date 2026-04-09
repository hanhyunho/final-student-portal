export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby26EjlRkoDy6NWTLNJgZHKWgDQFbQ-2JarGtTOWivvGW_Pd7BdhN7TqfxSZl6PePKy0w/exec";

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

    const text = await res.text();

    if (!text || !text.trim()) {
      return {
        ok: false,
        error: "Apps Script가 빈 응답을 반환했습니다.",
        raw: text,
      };
    }

    try {
      return JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: "Apps Script 응답이 JSON 형식이 아닙니다.",
        raw: text,
      };
    }
  } catch (error: any) {
    return {
      ok: false,
      error: `Apps Script 호출 실패: ${error?.message || String(error)}`,
    };
  }
}

function normalizeStudentResponse(result: any) {
  if (!result || typeof result !== "object") return null;

  if (Array.isArray(result.students)) {
    return { ...result, ok: result.ok !== false, students: result.students };
  }

  if (Array.isArray(result.data)) {
    return { ...result, ok: result.ok !== false, students: result.data };
  }

  if (result.data && Array.isArray(result.data.students)) {
    return { ...result, ok: result.ok !== false, students: result.data.students };
  }

  return null;
}

async function getFromAppsScript(req: Request) {
  try {
    const url = new URL(req.url);
    const examId = url.searchParams.get("exam_id");
    const query = [`action=list`];
    if (examId) {
      query.push(`exam_id=${encodeURIComponent(examId)}`);
    }
    const res = await fetch(`${APPS_SCRIPT_URL}?${query.join("&")}&_ts=${Date.now()}`, {
      method: "GET",
      cache: "no-store",
    });

    const text = await res.text();

    if (!text || !text.trim()) {
      return {
        ok: false,
        error: "Apps Script 조회 응답이 비어 있습니다.",
      };
    }

    try {
      const parsed = JSON.parse(text);
      const normalized = normalizeStudentResponse(parsed);
      return normalized || { ok: false, error: "Invalid Apps Script student response shape", raw: parsed };
    } catch {
      return {
        ok: false,
        error: `Apps Script 조회 응답이 JSON이 아닙니다: ${text}`,
      };
    }
  } catch (error: any) {
    return {
      ok: false,
      error: `Apps Script 조회 실패: ${error?.message || String(error)}`,
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript("create", body);

    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `학생 추가 API 오류: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript("update", body);

    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `학생 수정 API 오류: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript("delete", body);

    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `학생 삭제 API 오류: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const result = await getFromAppsScript(req);

  return Response.json(result, {
    status: result.ok ? 200 : 500,
  });
}