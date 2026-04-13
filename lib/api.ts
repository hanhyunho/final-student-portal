import type { MockScore, PhysicalRecord, Student } from "@/lib/dataService";

export const APPS_SCRIPT_URL =
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzMiiF4k6E2VAbLxOHJ39lGrDOv9PP9YnHI7he_Y-xyFtS91E4xjkRZG1vj68BKuPnBBA/exec";

export const APPS_SCRIPT_ACTIONS = {
  saveStudent: "saveStudent",
  saveAccountStatus: "saveAccountStatus",
  saveMockScore: "saveMockScore",
  savePhysicalRecord: "savePhysicalRecord",
} as const;

type AppsScriptSaveAction = (typeof APPS_SCRIPT_ACTIONS)[keyof typeof APPS_SCRIPT_ACTIONS];

type AppsScriptResponse<T = unknown> = {
  ok?: boolean;
  success?: boolean;
  error?: string;
  message?: string;
  data?: T;
  student?: Student;
  raw?: string;
  [key: string]: unknown;
};

type ParsedAppsScriptResponse<T = unknown> = {
  rawText: string;
  parsedResult: AppsScriptResponse<T>;
};

type SaveRowParams = {
  action: AppsScriptSaveAction;
  row: Record<string, unknown>;
};

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value === undefined || value === null ? "" : String(value);
  });

  return normalized;
}

function isAppsScriptSuccess<T>(result: AppsScriptResponse<T>) {
  return result.success === true || result.ok === true;
}

async function parseAppsScriptResponse<T>(response: Response): Promise<ParsedAppsScriptResponse<T>> {
  const text = await response.text();

  if (!text || !text.trim()) {
    return {
      rawText: text,
      parsedResult: {
        ok: false,
        success: false,
        error: "Apps Script가 빈 응답을 반환했습니다.",
      },
    };
  }

  try {
    return {
      rawText: text,
      parsedResult: JSON.parse(text) as AppsScriptResponse<T>,
    };
  } catch {
    return {
      rawText: text,
      parsedResult: {
        ok: false,
        success: false,
        error: `Apps Script 응답 파싱에 실패했습니다: ${text}`,
        raw: text,
      },
    };
  }
}

export async function postAppsScript<T = unknown>(payload: Record<string, unknown>) {
  const response = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const { rawText, parsedResult } = await parseAppsScriptResponse<T>(response);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[apps-script] response", {
      action: payload.action,
      targetUrl: APPS_SCRIPT_URL,
      responseStatus: response.status,
      rawText,
      parsedResult,
    });
  }

  if (isAppsScriptSuccess(parsedResult)) {
    return parsedResult;
  }

  if (!response.ok || !isAppsScriptSuccess(parsedResult)) {
    console.error("[apps-script] request failed", {
      action: payload.action,
      targetUrl: APPS_SCRIPT_URL,
      responseOk: response.ok,
      responseStatus: response.status,
      rawText,
      parsedResult,
    });

    throw new Error(
      parsedResult.error || parsedResult.message || `Apps Script 요청에 실패했습니다. (status: ${response.status})`
    );
  }

  return parsedResult;
}

export async function saveAppsScriptRow<T = unknown>({ action, row }: SaveRowParams) {
  return postAppsScript<T>({
    action,
    row: normalizeRow(row),
  });
}

export async function saveStudent(row: Student | Record<string, unknown>) {
  const requestBody = {
    action: APPS_SCRIPT_ACTIONS.saveStudent,
    row: normalizeRow(row as Record<string, unknown>),
  };

  if (process.env.NODE_ENV === "development") {
    console.info("[saveStudent] targetUrl", APPS_SCRIPT_URL);
    console.info("[saveStudent] request body", requestBody);
  }

  try {
    const response = await fetch("/api/students", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const { parsedResult } = await parseAppsScriptResponse<Student>(response);
    if (process.env.NODE_ENV === "development") {
      console.info("[saveStudent] parsed result", parsedResult);
    }

    if (parsedResult.success === true || parsedResult.ok === true) {
      return parsedResult;
    }

    throw new Error(
      parsedResult.error ||
      parsedResult.message ||
      `학생 정보를 저장하지 못했습니다. (status: ${response.status})`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "학생 정보를 저장하지 못했습니다.";
    const failureResult = {
      ok: false,
      success: false,
      error: `${message} (targetUrl: ${APPS_SCRIPT_URL})`,
    };

    console.error("[saveStudent] request failed", failureResult);
    if (process.env.NODE_ENV === "development") {
      console.info("[saveStudent] parsed result", failureResult);
    }

    throw new Error(failureResult.error);
  }
}

export async function saveAccountStatus(row: Record<string, unknown>) {
  const requestBody = {
    action: APPS_SCRIPT_ACTIONS.saveAccountStatus,
    row: normalizeRow(row),
  };

  const response = await fetch("/api/accounts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify(requestBody),
    cache: "no-store",
  });

  const { parsedResult } = await parseAppsScriptResponse<Record<string, unknown>>(response);

  if (parsedResult.success === true || parsedResult.ok === true) {
    return parsedResult;
  }

  throw new Error(
    parsedResult.error ||
      parsedResult.message ||
      `계정 로그인여부를 저장하지 못했습니다. (status: ${response.status})`
  );
}

export async function saveMockScore(row: MockScore | Record<string, unknown>) {
  return saveAppsScriptRow<MockScore>({
    action: APPS_SCRIPT_ACTIONS.saveMockScore,
    row,
  });
}

export async function savePhysicalRecord(row: PhysicalRecord | Record<string, unknown>) {
  return saveAppsScriptRow<PhysicalRecord>({
    action: APPS_SCRIPT_ACTIONS.savePhysicalRecord,
    row,
  });
}