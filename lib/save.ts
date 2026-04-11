type SavePortalRowParams = {
  action: "saveStudent" | "saveMockScore" | "savePhysicalRecord";
  row: Record<string, unknown>;
};

function normalizeRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};

  Object.entries(row).forEach(([key, value]) => {
    normalized[key] = value === undefined || value === null ? "" : String(value);
  });

  return normalized;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text || !text.trim()) {
    return { success: false, error: "Apps Script returned an empty response." };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, error: `Apps Script returned non-JSON: ${text}` };
  }
}

export async function savePortalRow({ action, row }: SavePortalRowParams) {
  const appsScriptUrl =
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL ||
    process.env.APPS_SCRIPT_URL ||
    "https://script.google.com/macros/s/AKfycbzMiiF4k6E2VAbLxOHJ39lGrDOv9PP9YnHI7he_Y-xyFtS91E4xjkRZG1vj68BKuPnBBA/exec";

  if (!appsScriptUrl) {
    throw new Error("NEXT_PUBLIC_APPS_SCRIPT_URL is not configured.");
  }

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action,
      row: normalizeRow(row),
    }),
    cache: "no-store",
  });

  const result = await parseResponse(response);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[savePortalRow] response", {
      action,
      targetUrl: appsScriptUrl,
      success: result.success,
      ok: result.ok,
      error: result.error,
    });
  }

  if (!response.ok || (result.success === false && result.ok === false)) {
    console.error("[savePortalRow] request failed", {
      action,
      targetUrl: appsScriptUrl,
      success: result.success,
      ok: result.ok,
      error: result.error || result.message,
    });
    throw new Error(result.error || result.message || `${action} save failed. (targetUrl: ${appsScriptUrl})`);
  }

  return result;
}