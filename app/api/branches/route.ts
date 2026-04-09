export const dynamic = "force-dynamic";

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby26EjlRkoDy6NWTLNJgZHKWgDQFbQ-2JarGtTOWivvGW_Pd7BdhN7TqfxSZl6PePKy0w/exec";

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
      `${APPS_SCRIPT_URL}?action=listBranches&_ts=${Date.now()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const text = await res.text();

    if (!text || !text.trim()) {
      return Response.json(
        {
          ok: false,
          error: "branches 응답이 비어 있습니다.",
        },
        { status: 500 }
      );
    }

    try {
      const result = JSON.parse(text);
      return Response.json(result, {
        status: result.ok ? 200 : 500,
      });
    } catch {
      return Response.json(
        {
          ok: false,
          error: `branches 응답이 JSON이 아닙니다: ${text}`,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `branches 조회 실패: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript("createBranch", body);

    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `Branch creation failed: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript("updateBranch", body);

    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `Branch update failed: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript("deleteBranch", body);

    return Response.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: any) {
    return Response.json(
      {
        ok: false,
        error: `Branch deletion failed: ${error?.message || String(error)}`,
      },
      { status: 500 }
    );
  }
}