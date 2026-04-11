export const dynamic = "force-dynamic";

const SAVE_BRANCH_ACTION = "saveBranch";
const DELETE_BRANCH_ACTION = "deleteBranch";
const BRANCH_CACHE_TTL_MS = 15_000;

const APPS_SCRIPT_URL =
  process.env.APPS_SCRIPT_URL ||
  process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzMiiF4k6E2VAbLxOHJ39lGrDOv9PP9YnHI7he_Y-xyFtS91E4xjkRZG1vj68BKuPnBBA/exec";

const APPS_SCRIPT_URL_SOURCE = process.env.APPS_SCRIPT_URL
  ? "APPS_SCRIPT_URL"
  : process.env.NEXT_PUBLIC_APPS_SCRIPT_URL
    ? "NEXT_PUBLIC_APPS_SCRIPT_URL"
    : "fallback";

type BranchRouteResult = {
  ok?: boolean;
  success?: boolean;
  error?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  branches?: unknown;
  data?: unknown;
  row?: unknown;
  raw?: string;
  action?: unknown;
  mode?: unknown;
  rowIndex?: unknown;
  [key: string]: unknown;
};

type BranchMutationAction = "saveBranch" | "deleteBranch";

type BranchRow = {
  branch_id: string;
  branch_code?: string;
  branch_name: string;
  manager_name?: string;
  manager_phone?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: string | undefined;
};

type BranchCacheState = {
  expiresAt: number;
  branches: BranchRow[];
};

let branchCache: BranchCacheState | null = null;
let branchRequestPromise: Promise<BranchRow[]> | null = null;

function stringValue(value: unknown) {
  return String(value ?? "").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value === undefined || value === null ? "" : String(value).trim();
  });

  return normalized;
}

function logRouteError(details: {
  stage: string;
  action?: string;
  requestUrl?: string;
  targetUrl?: string;
  responseStatus?: number | null;
  rawText?: string;
  parsedResult?: unknown;
  error?: unknown;
}) {
  const error = details.error;

  console.error("[api/branches] route error", {
    stage: details.stage,
    action: details.action || "",
    requestUrl: details.requestUrl || "",
    appsScriptTargetUrl: details.targetUrl || APPS_SCRIPT_URL,
    appsScriptUrlSource: APPS_SCRIPT_URL_SOURCE,
    responseStatus: details.responseStatus ?? null,
    rawText: details.rawText ?? "",
    parsedResult: details.parsedResult ?? null,
    errorMessage: error instanceof Error ? error.message : String(error ?? ""),
    "error.stack": error instanceof Error ? error.stack || "" : "",
  });
}

function buildAppsScriptMeta(raw?: string) {
  return {
    targetUrl: APPS_SCRIPT_URL,
    targetUrlSource: APPS_SCRIPT_URL_SOURCE,
    raw: raw || "",
  };
}

function isEffectivelyEmptyBranchRow(row: Record<string, string>) {
  const keys = Object.keys(row);

  if (keys.length === 0) {
    return true;
  }

  return keys.every((key) => stringValue(row[key]) === "");
}

function extractBranchRows(result: unknown) {
  if (Array.isArray(result)) {
    return result;
  }

  if (!isRecord(result)) {
    return null;
  }

  if (Array.isArray(result.branches)) {
    return result.branches;
  }

  if (Array.isArray(result.data)) {
    return result.data;
  }

  if (isRecord(result.data) && Array.isArray(result.data.branches)) {
    return result.data.branches;
  }

  if (Array.isArray(result.row)) {
    return result.row;
  }

  return null;
}

function normalizeBranchRow(rawRow: unknown): BranchRow | null {
  if (!isRecord(rawRow)) {
    return null;
  }

  const normalizedRow: Record<string, string> = {};

  Object.entries(rawRow).forEach(([key, value]) => {
    normalizedRow[key] = stringValue(value);
  });

  if (isEffectivelyEmptyBranchRow(normalizedRow)) {
    return null;
  }

  const branchId = stringValue(normalizedRow.branch_id);
  const branchName = stringValue(normalizedRow.branch_name);

  if (!branchId || !branchName) {
    return null;
  }

  return {
    ...normalizedRow,
    branch_id: branchId,
    branch_code: stringValue(normalizedRow.branch_code),
    branch_name: branchName,
    manager_name: stringValue(normalizedRow.manager_name),
    manager_phone: stringValue(normalizedRow.manager_phone),
    status: stringValue(normalizedRow.status),
    created_at: stringValue(normalizedRow.created_at),
    updated_at: stringValue(normalizedRow.updated_at),
  };
}

function normalizeBranchesResult(result: unknown) {
  const rawBranches = extractBranchRows(result) || [];

  return rawBranches
    .map((row) => normalizeBranchRow(row))
    .filter((row): row is BranchRow => row !== null);
}

function extractSingleBranch(result: BranchRouteResult) {
  return result.branch ?? result.data ?? result.row ?? null;
}

function getMutationAction(payload: unknown, fallbackAction: BranchMutationAction) {
  if (!isRecord(payload)) {
    return fallbackAction;
  }

  const requestedAction = stringValue(payload.action);

  if (!requestedAction) {
    return fallbackAction;
  }

  return requestedAction;
}

function parseBranchSequence(branchId: string) {
  const match = branchId.match(/^BR(\d+)$/i);

  if (!match) {
    return 0;
  }

  return Number(match[1] || 0);
}

function buildNextBranchId(branches: BranchRow[]) {
  const maxSequence = branches.reduce((currentMax, branch) => {
    return Math.max(currentMax, parseBranchSequence(stringValue(branch.branch_id)));
  }, 0);

  return `BR${String(maxSequence + 1).padStart(3, "0")}`;
}

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
const HANGUL_INITIALS = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
const HANGUL_VOWELS = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
const HANGUL_FINALS = ["", "k", "k", "ks", "n", "nj", "nh", "t", "l", "lk", "lm", "lb", "ls", "lt", "lp", "lh", "m", "p", "ps", "t", "t", "ng", "t", "t", "k", "t", "p", "h"];

function romanizeHangulCharacter(character: string) {
  const codePoint = character.charCodeAt(0);

  if (codePoint < HANGUL_BASE || codePoint > HANGUL_LAST) {
    return character;
  }

  const syllableIndex = codePoint - HANGUL_BASE;
  const initialIndex = Math.floor(syllableIndex / (21 * 28));
  const vowelIndex = Math.floor((syllableIndex % (21 * 28)) / 28);
  const finalIndex = syllableIndex % 28;

  return `${HANGUL_INITIALS[initialIndex]}${HANGUL_VOWELS[vowelIndex]}${HANGUL_FINALS[finalIndex]}`;
}

function romanizeBranchName(branchName: string) {
  return Array.from(branchName)
    .map((character) => romanizeHangulCharacter(character))
    .join("")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toUpperCase();
}

function buildBaseBranchCode(branchName: string) {
  const romanizedBranchName = romanizeBranchName(branchName);

  if (romanizedBranchName) {
    return romanizedBranchName.slice(0, 3);
  }

  return "BRN";
}

function buildUniqueBranchCode(branchName: string, branches: BranchRow[], branchId: string) {
  const baseCode = buildBaseBranchCode(branchName);
  const usedCodes = new Set(
    branches
      .filter((branch) => stringValue(branch.branch_id) !== branchId)
      .map((branch) => stringValue(branch.branch_code).toUpperCase())
      .filter(Boolean)
  );

  if (!usedCodes.has(baseCode)) {
    return baseCode;
  }

  let suffix = 2;
  let candidateCode = `${baseCode}${suffix}`;

  while (usedCodes.has(candidateCode)) {
    suffix += 1;
    candidateCode = `${baseCode}${suffix}`;
  }

  return candidateCode;
}

async function buildSaveBranchBody(payload: unknown, requestUrl?: string) {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const sourceRow = source.row && typeof source.row === "object"
    ? (source.row as Record<string, unknown>)
    : source;
  const normalizedRow = normalizeRow(sourceRow);
  const now = new Date().toISOString();
  const requestedBranchId = stringValue(normalizedRow.branch_id);
  const requestedBranchCode = stringValue(normalizedRow.branch_code);
  const requestedCreatedAt = stringValue(normalizedRow.created_at);
  let branches: BranchRow[] = [];

  if (!requestedBranchId || !requestedBranchCode || !requestedCreatedAt) {
    try {
      branches = await getCachedBranches(requestUrl);
    } catch (error: unknown) {
      logRouteError({
        stage: "buildSaveBranchBody:getCachedBranches",
        action: SAVE_BRANCH_ACTION,
        requestUrl,
        targetUrl: APPS_SCRIPT_URL,
        error,
      });

      branches = [];
    }
  }

  const resolvedBranchId = requestedBranchId || buildNextBranchId(branches);
  const existingBranch = branches.find((branch) => stringValue(branch.branch_id) === resolvedBranchId) || null;

  normalizedRow.branch_id = resolvedBranchId;
  normalizedRow.branch_name = stringValue(normalizedRow.branch_name);
  normalizedRow.branch_code =
    requestedBranchCode ||
    stringValue(existingBranch?.branch_code) ||
    buildUniqueBranchCode(normalizedRow.branch_name, branches, resolvedBranchId);
  normalizedRow.status = stringValue(normalizedRow.status) || stringValue(existingBranch?.status) || "active";
  normalizedRow.created_at =
    requestedCreatedAt ||
    stringValue(existingBranch?.created_at) ||
    now;
  normalizedRow.updated_at = now;

  return {
    action: SAVE_BRANCH_ACTION,
    row: normalizedRow,
  };
}

function buildDeleteBranchBody(payload: unknown) {
  const source = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const sourceRow = source.row && typeof source.row === "object"
    ? (source.row as Record<string, unknown>)
    : source;

  return {
    action: DELETE_BRANCH_ACTION,
    row: normalizeRow(sourceRow),
  };
}

function invalidateBranchCache() {
  branchCache = null;
  branchRequestPromise = null;
}

async function forwardToAppsScript(payload: Record<string, unknown>, requestUrl?: string): Promise<BranchRouteResult> {
  let responseStatus: number | null = null;
  let rawText = "";
  let parsedResult: unknown = null;

  try {
    if (process.env.NODE_ENV === "development") {
      console.info("[api/branches] forward body", payload);
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
        statusCode: responseStatus ?? 500,
      };
    }

    try {
      parsedResult = JSON.parse(rawText);
      return isRecord(parsedResult)
        ? ({ ...parsedResult, raw: stringValue((parsedResult as BranchRouteResult).raw) || rawText } as BranchRouteResult)
        : {
            ok: false,
            success: false,
            error: "Apps Script 응답 형식이 올바르지 않습니다.",
            raw: rawText,
            statusCode: responseStatus ?? 500,
          };
    } catch (error: unknown) {
      logRouteError({
        stage: "forwardToAppsScript:parse",
        action: stringValue(payload.action),
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
        error: "Apps Script 응답이 JSON 형식이 아닙니다.",
        raw: rawText,
        statusCode: responseStatus ?? 500,
      };
    }
  } catch (error: unknown) {
    logRouteError({
      stage: "forwardToAppsScript:fetch",
        action: stringValue(payload.action),
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
      error: `Apps Script 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
      statusCode: responseStatus ?? 500,
    };
  }
}

async function fetchBranchesFromAppsScript(requestUrl?: string): Promise<BranchRow[]> {
  let responseStatus: number | null = null;
  let rawText = "";
  let parsedResult: unknown = null;

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=listBranches`, {
      method: "GET",
      cache: "no-store",
    });

    responseStatus = res.status;
    rawText = await res.text();

    if (!rawText || !rawText.trim()) {
      throw new Error("branches 응답이 비어 있습니다.");
    }

    parsedResult = JSON.parse(rawText);

    if (process.env.NODE_ENV === "development") {
      console.log("[api/branches] parsed result", parsedResult);
    }

    if (isRecord(parsedResult) && (parsedResult.ok === false || parsedResult.success === false)) {
      throw new Error(
        stringValue(parsedResult.error) || stringValue(parsedResult.message) || "branches 조회 실패"
      );
    }

    return normalizeBranchesResult(parsedResult);
  } catch (error: unknown) {
    logRouteError({
      stage: "fetchBranchesFromAppsScript",
      action: "listBranches",
      requestUrl,
      targetUrl: APPS_SCRIPT_URL,
      responseStatus,
      rawText,
      parsedResult,
      error,
    });

    throw error instanceof Error ? error : new Error(String(error));
  }
}

async function getCachedBranches(requestUrl?: string) {
  const now = Date.now();

  if (branchCache && branchCache.expiresAt > now) {
    return branchCache.branches;
  }

  if (branchRequestPromise) {
    return branchRequestPromise;
  }

  branchRequestPromise = fetchBranchesFromAppsScript(requestUrl)
    .then((branches) => {
      branchCache = {
        expiresAt: Date.now() + BRANCH_CACHE_TTL_MS,
        branches,
      };

      return branches;
    })
    .finally(() => {
      branchRequestPromise = null;
    });

  return branchRequestPromise;
}

function buildSaveSuccessResponse(result: BranchRouteResult, fallbackRow?: Record<string, unknown>) {
  const normalizedBranch = normalizeBranchRow(extractSingleBranch(result) ?? fallbackRow ?? null);

  return Response.json(
    {
      ok: true,
      success: true,
      action: SAVE_BRANCH_ACTION,
      mode: stringValue(result.mode) || "insert",
      rowIndex: typeof result.rowIndex === "number" ? result.rowIndex : Number(result.rowIndex || 0),
      branch: normalizedBranch,
      data: normalizedBranch,
      ...buildAppsScriptMeta(stringValue(result.raw)),
    },
    { status: 200 }
  );
}

function buildMutationFailureResponse(result: BranchRouteResult, fallbackMessage: string) {
  const status = result.statusCode === 400 || result.status === 400 ? 400 : result.statusCode === 404 || result.status === 404 ? 404 : 500;

  return Response.json(
    {
      ok: false,
      success: false,
      error: result.error || result.message || fallbackMessage,
      message: result.message || fallbackMessage,
      data: normalizeBranchRow(result.data ?? result.row ?? null),
      ...buildAppsScriptMeta(stringValue(result.raw)),
    },
    { status }
  );
}

async function handleSaveBranch(req: Request, fallbackMessage: string) {
  try {
    const body = await req.json();
    const action = getMutationAction(body, SAVE_BRANCH_ACTION);

    if (action !== SAVE_BRANCH_ACTION) {
      return buildMutationFailureResponse(
        {
          ok: false,
          success: false,
          statusCode: 400,
          error: `Unsupported POST action: ${action || ""}`,
        },
        fallbackMessage
      );
    }

    const requestBody = await buildSaveBranchBody(body, req.url);
    const result = await forwardToAppsScript(requestBody, req.url);

    if (result.ok === true || result.success === true) {
      invalidateBranchCache();
      return buildSaveSuccessResponse(result, requestBody.row);
    }

    return buildMutationFailureResponse(result, fallbackMessage);
  } catch (error: unknown) {
    logRouteError({
      stage: "handleSaveBranch",
      action: SAVE_BRANCH_ACTION,
      requestUrl: req.url,
      targetUrl: APPS_SCRIPT_URL,
      error,
    });

    return buildMutationFailureResponse(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        raw: "",
      },
      fallbackMessage
    );
  }
}

export async function GET(req: Request) {
  try {
    const branches = await getCachedBranches(req.url);

    return Response.json(
      {
        ok: true,
        success: true,
        branches,
        ...buildAppsScriptMeta(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return Response.json(
      {
        ok: false,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        branches: [],
        ...buildAppsScriptMeta(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  return handleSaveBranch(req, "지점 추가 API 오류");
}

export async function PUT(req: Request) {
  return handleSaveBranch(req, "지점 수정 API 오류");
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const action = getMutationAction(body, DELETE_BRANCH_ACTION);

    if (action !== DELETE_BRANCH_ACTION) {
      return buildMutationFailureResponse(
        {
          ok: false,
          success: false,
          statusCode: 400,
          error: `Unsupported DELETE action: ${action || ""}`,
        },
        "지점 삭제 API 오류"
      );
    }

    const result = await forwardToAppsScript(buildDeleteBranchBody(body), req.url);

    if (result.ok === true || result.success === true) {
      invalidateBranchCache();

      return Response.json(
        {
          ok: true,
          success: true,
          action: DELETE_BRANCH_ACTION,
          rowIndex: typeof result.rowIndex === "number" ? result.rowIndex : Number(result.rowIndex || 0),
          data: normalizeBranchRow(result.data ?? result.row ?? null),
        },
        { status: 200 }
      );
    }

    return buildMutationFailureResponse(result, "지점 삭제 API 오류");
  } catch (error: unknown) {
    logRouteError({
      stage: "DELETE",
      action: DELETE_BRANCH_ACTION,
      requestUrl: req.url,
      targetUrl: APPS_SCRIPT_URL,
      error,
    });

    return buildMutationFailureResponse(
      {
        ok: false,
        success: false,
        error: `지점 삭제 API 오류: ${error instanceof Error ? error.message : String(error)}`,
      },
      "지점 삭제 API 오류"
    );
  }
}
