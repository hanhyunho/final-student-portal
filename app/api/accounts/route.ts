import { getAccountsSheet } from "@/lib/sheets";

export const dynamic = "force-dynamic";

const SAVE_ACCOUNT_STATUS_ACTION = "saveAccountStatus";
const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbwg7vShRN81QwHUBVHd8ZV18MOaptABerhtg-Fvqw2R1isYTl3muP0xGwOXATBEBqwHlg/exec";

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value === undefined || value === null ? "" : String(value);
  });

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text || !text.trim()) {
    return { ok: false, success: false, error: "Apps Script가 빈 응답을 반환했습니다." };
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, success: false, error: `Apps Script 응답 파싱 실패: ${text}` };
  }
}

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const sourceRow = isRecord(body.row) ? body.row : body;
    const payload = {
      action: SAVE_ACCOUNT_STATUS_ACTION,
      row: normalizeRow(sourceRow),
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const result = await parseResponse(response);

    if (result.success === true || result.ok === true) {
      return Response.json(result, { status: 200 });
    }

    return Response.json(
      {
        ok: false,
        success: false,
        error:
          String(result.error || result.message || "계정 로그인여부를 저장하지 못했습니다."),
      },
      { status: response.status >= 400 ? response.status : 500 }
    );
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
