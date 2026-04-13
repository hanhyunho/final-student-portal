export const dynamic = "force-dynamic";

import { getBranchesSheet } from "@/lib/sheets";

const SAVE_STUDENT_ACTION = "saveStudent";
const BRANCH_LOOKUP_CACHE_TTL_MS = 15_000;

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzMiiF4k6E2VAbLxOHJ39lGrDOv9PP9YnHI7he_Y-xyFtS91E4xjkRZG1vj68BKuPnBBA/exec";

type RouteResult = {
  ok?: boolean;
  success?: boolean;
  error?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  data?: unknown;
  row?: unknown;
  students?: unknown;
  raw?: string;
  [key: string]: unknown;
};

type BranchRow = {
  branch_id?: string;
  branch_code?: string;
  branch_name?: string;
  [key: string]: string | undefined;
};

type StudentRow = Record<string, string> & {
  student_id: string;
  name: string;
  branch_id: string;
  branch_name: string;
};

type BranchLookupCacheState = {
  expiresAt: number;
  lookup: Map<string, string>;
};

let branchLookupCache: BranchLookupCacheState | null = null;
let branchLookupPromise: Promise<Map<string, string>> | null = null;

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function logRouteError(details: {
  stage: string;
  requestUrl?: string;
  targetUrl?: string;
  responseStatus?: number | null;
  rawText?: string;
  parsedResult?: unknown;
  error?: unknown;
}) {
  const error = details.error;

  console.error("[api/students] route error", {
    stage: details.stage,
    requestUrl: details.requestUrl || "",
    appsScriptTargetUrl: details.targetUrl || APPS_SCRIPT_URL,
    responseStatus: details.responseStatus ?? null,
    rawText: details.rawText ?? "",
    parsedResult: details.parsedResult ?? null,
    errorMessage: error instanceof Error ? error.message : String(error ?? ""),
    "error.stack": error instanceof Error ? error.stack || "" : "",
  });
}

function buildBranchLookup(branches: BranchRow[]) {
  const lookup = new Map<string, string>();

  branches.forEach((branch) => {
    const branchId = stringValue(branch.branch_id);
    const branchName = stringValue(branch.branch_name);

    if (!branchId) {
      return;
    }

    lookup.set(branchId, branchName);
  });

  return lookup;
}

async function getSafeBranchLookup(requestUrl?: string) {
  const now = Date.now();

  if (branchLookupCache && branchLookupCache.expiresAt > now) {
    return branchLookupCache.lookup;
  }

  if (branchLookupPromise) {
    return branchLookupPromise;
  }

  branchLookupPromise = (async () => {
  try {
      const branches = await getBranchesSheet();
      const lookup = buildBranchLookup(branches as BranchRow[]);

      branchLookupCache = {
        expiresAt: Date.now() + BRANCH_LOOKUP_CACHE_TTL_MS,
        lookup,
      };

      return lookup;
  } catch (error: unknown) {
      logRouteError({
        stage: "getSafeBranchLookup",
        requestUrl,
        targetUrl: APPS_SCRIPT_URL,
        error,
      });

      return new Map<string, string>();
    } finally {
      branchLookupPromise = null;
    }
  })();

  return branchLookupPromise;
}

function isEffectivelyEmptyStudentRow(row: Record<string, string>) {
  const keys = Object.keys(row);

  if (keys.length === 0) {
    return true;
  }

  return keys.every((key) => {
    if (key === "created_at" || key === "updated_at") {
      return true;
    }

    return stringValue(row[key]) === "";
  });
}

function normalizeStudentRow(rawRow: unknown, branchLookup: Map<string, string>): StudentRow | null {
  if (!isRecord(rawRow)) {
    return null;
  }

  const normalizedRow: Record<string, string> = {};

  Object.entries(rawRow).forEach(([key, value]) => {
    normalizedRow[key] = stringValue(value);
  });

  if (isEffectivelyEmptyStudentRow(normalizedRow)) {
    return null;
  }

  const studentId = stringValue(normalizedRow.student_id);
  const name = stringValue(normalizedRow.name);
  const branchId = stringValue(normalizedRow.branch_id);

  if (!studentId || !name) {
    return null;
  }

  return {
    ...normalizedRow,
    student_id: studentId,
    name,
    branch_id: branchId || "",
    branch_name: branchId ? branchLookup.get(branchId) || "" : "",
  };
}

function extractStudentRows(result: RouteResult) {
  if (Array.isArray(result.students)) {
    return result.students;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (isRecord(result.data) && Array.isArray(result.data.students)) {
    return result.data.students;
  }

  if (Array.isArray(result.row)) {
    return result.row;
  }

  return null;
}

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value === undefined || value === null ? "" : String(value);
  });

  return normalized;
}

function buildSaveStudentBody(payload: unknown) {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const sourceRow = source.row && typeof source.row === "object"
    ? (source.row as Record<string, unknown>)
    : source;

  return {
    action: SAVE_STUDENT_ACTION,
    row: normalizeRow(sourceRow),
  };
}

async function forwardToAppsScript(payload: Record<string, unknown>): Promise<RouteResult> {
  let responseStatus: number | null = null;
  let rawText = "";
  let parsedResult: unknown = null;

  try {
    if (process.env.NODE_ENV === "development") {
      console.info("[api/students] forward body", payload);
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    responseStatus = res.status;

    rawText = await res.text();

    if (!rawText || !rawText.trim()) {
      return {
        ok: false,
        success: false,
        error: "Apps Script가 빈 응답을 반환했습니다.",
        raw: rawText,
      };
    }

    try {
      parsedResult = JSON.parse(rawText);
      return isRecord(parsedResult) ? (parsedResult as RouteResult) : { ok: false, error: "Apps Script 응답 형식이 올바르지 않습니다.", raw: rawText };
    } catch (error: unknown) {
      logRouteError({
        stage: "forwardToAppsScript:parse",
        targetUrl: APPS_SCRIPT_URL,
        responseStatus,
        rawText,
        parsedResult,
        error,
      });

      return {
        ok: false,
        success: false,
        error: "Apps Script 응답이 JSON 형식이 아닙니다.",
        raw: rawText,
      };
    }
  } catch (error: unknown) {
    logRouteError({
      stage: "forwardToAppsScript:fetch",
      targetUrl: APPS_SCRIPT_URL,
      responseStatus,
      rawText,
      parsedResult,
      error,
    });

    return {
      ok: false,
      success: false,
      error: `Apps Script 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function isSaveSuccess(result: RouteResult) {
  return result?.success === true;
}

function buildSaveSuccessResponse(result: RouteResult) {
  return Response.json(
    {
      ok: true,
      success: true,
      data: result?.data ?? result?.row ?? result,
      account: result?.account ?? null,
      mode: result?.mode ?? null,
      rowIndex: result?.rowIndex ?? null,
      message: result?.message ?? "저장 완료",
      targetUrl: APPS_SCRIPT_URL,
    },
    { status: 200 }
  );
}

function buildSaveFailureResponse(result: RouteResult, fallbackMessage: string) {
  const status = result?.statusCode === 400 || result?.status === 400 ? 400 : 500;

  return Response.json(
    {
      ok: false,
      success: false,
      error: result?.error || result?.message || fallbackMessage,
      message: result?.message || fallbackMessage,
      data: result?.data ?? result?.row ?? null,
      mode: result?.mode ?? null,
      rowIndex: result?.rowIndex ?? null,
      targetUrl: APPS_SCRIPT_URL,
    },
    { status }
  );
}

async function normalizeStudentResponse(result: RouteResult): Promise<RouteResult | null> {
  if (!isRecord(result)) {
    return null;
  }

  if (result.ok === false || result.success === false) {
    return {
      ok: false,
      success: false,
      error: stringValue(result.error) || stringValue(result.message) || "학생 조회 실패",
      raw: stringValue(result.raw),
    };
  }

  const rawStudents = extractStudentRows(result);

  if (!rawStudents) {
    return {
      ok: true,
      success: true,
      students: [],
    };
  }

  const branchLookup = await getSafeBranchLookup();
  const students = rawStudents
    .map((row) => normalizeStudentRow(row, branchLookup))
    .filter((row): row is StudentRow => row !== null);

  return {
    ok: true,
    success: true,
    students,
  };
}

async function getFromAppsScript(req: Request): Promise<RouteResult> {
  const requestUrl = req.url;
  let responseStatus: number | null = null;
  let rawText = "";
  let parsedResult: unknown = null;

  try {
    const url = new URL(req.url);
    const examId = url.searchParams.get("exam_id");
    const query = [`action=list`];
    if (examId) {
      query.push(`exam_id=${encodeURIComponent(examId)}`);
    }
    const res = await fetch(`${APPS_SCRIPT_URL}?${query.join("&")}`, {
      method: "GET",
      cache: "no-store",
    });

    responseStatus = res.status;

    rawText = await res.text();

    if (!rawText || !rawText.trim()) {
      logRouteError({
        stage: "getFromAppsScript:empty-response",
        requestUrl,
        targetUrl: APPS_SCRIPT_URL,
        responseStatus,
        rawText,
        parsedResult,
      });

      return {
        ok: false,
        success: false,
        error: "Apps Script 조회 응답이 비어 있습니다.",
      };
    }

    try {
      parsedResult = JSON.parse(rawText) as RouteResult;
      const normalized = await normalizeStudentResponse(parsedResult as RouteResult);

      if (process.env.NODE_ENV === "development") {
        console.log("[api/students] parsed result", parsedResult);
        console.log("[api/students] final body", normalized);
      }

      if (!normalized) {
        logRouteError({
          stage: "getFromAppsScript:normalize-shape",
          requestUrl,
          targetUrl: APPS_SCRIPT_URL,
          responseStatus,
          rawText,
          parsedResult,
        });

        return { ok: false, success: false, error: "Invalid Apps Script student response shape", raw: rawText };
      }

      if (responseStatus >= 400 || normalized.ok === false) {
        logRouteError({
          stage: "getFromAppsScript:upstream-error",
          requestUrl,
          targetUrl: APPS_SCRIPT_URL,
          responseStatus,
          rawText,
          parsedResult: normalized,
        });
      }

      return normalized;
    } catch (error: unknown) {
      logRouteError({
        stage: "getFromAppsScript:parse-or-normalize",
        requestUrl,
        targetUrl: APPS_SCRIPT_URL,
        responseStatus,
        rawText,
        parsedResult,
        error,
      });

      return {
        ok: false,
        success: false,
        error: `Apps Script 조회 응답이 JSON이 아닙니다: ${rawText}`,
        raw: rawText,
      };
    }
  } catch (error: unknown) {
    logRouteError({
      stage: "getFromAppsScript:fetch",
      requestUrl,
      targetUrl: APPS_SCRIPT_URL,
      responseStatus,
      rawText,
      parsedResult,
      error,
    });

    return {
      ok: false,
      success: false,
      error: `Apps Script 조회 실패: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const forwardBody = buildSaveStudentBody(body);
    const result = await forwardToAppsScript(forwardBody);

    if (isSaveSuccess(result)) {
      return buildSaveSuccessResponse(result);
    }

    if (result?.success === false) {
      console.error("[api/students] save failed", {
        action: SAVE_STUDENT_ACTION,
        targetUrl: APPS_SCRIPT_URL,
        student_id: forwardBody.row?.student_id,
        error: result.error || result.message,
      });
    }

    return buildSaveFailureResponse(result, "학생 추가 API 오류");
  } catch (error: unknown) {
    logRouteError({
      stage: "POST",
      requestUrl: req.url,
      targetUrl: APPS_SCRIPT_URL,
      error,
    });

    return buildSaveFailureResponse(
      {
        success: false,
        error: `학생 추가 API 오류: ${error instanceof Error ? error.message : String(error)}`,
      },
      "학생 추가 API 오류"
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const forwardBody = buildSaveStudentBody(body);
    const result = await forwardToAppsScript(forwardBody);

    if (isSaveSuccess(result)) {
      return buildSaveSuccessResponse(result);
    }

    if (result?.success === false) {
      console.error("[api/students] save failed", {
        action: SAVE_STUDENT_ACTION,
        targetUrl: APPS_SCRIPT_URL,
        student_id: forwardBody.row?.student_id,
        error: result.error || result.message,
      });
    }

    return buildSaveFailureResponse(result, "학생 수정 API 오류");
  } catch (error: unknown) {
    logRouteError({
      stage: "PUT",
      requestUrl: req.url,
      targetUrl: APPS_SCRIPT_URL,
      error,
    });

    return buildSaveFailureResponse(
      {
        success: false,
        error: `학생 수정 API 오류: ${error instanceof Error ? error.message : String(error)}`,
      },
      "학생 수정 API 오류"
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const result = await forwardToAppsScript({
      action: "delete",
      ...(body && typeof body === "object" ? body : {}),
    });

    return Response.json({ ...result, targetUrl: APPS_SCRIPT_URL }, {
      status: result.ok ? 200 : 500,
    });
  } catch (error: unknown) {
    logRouteError({
      stage: "DELETE",
      requestUrl: req.url,
      targetUrl: APPS_SCRIPT_URL,
      error,
    });

    return Response.json(
      {
        ok: false,
        error: `학생 삭제 API 오류: ${error instanceof Error ? error.message : String(error)}`,
        targetUrl: APPS_SCRIPT_URL,
      },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const result = await getFromAppsScript(req);

  if (result.ok === true) {
    return Response.json(
      {
        ok: true,
        success: true,
        students: Array.isArray(result.students) ? result.students : [],
      },
      { status: 200 }
    );
  }

  return Response.json(
    {
      ok: false,
      success: false,
      error: result.error || result.message || "학생 조회 실패",
      raw: result.raw || "",
      students: [],
    },
    { status: 500 }
  );
}