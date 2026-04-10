type SavePortalRowParams = {
  sheetName: string;
  keyField: string;
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

export async function savePortalRow({ sheetName, keyField, row }: SavePortalRowParams) {
  const appsScriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

  if (!appsScriptUrl) {
    throw new Error("NEXT_PUBLIC_APPS_SCRIPT_URL is not configured.");
  }

  const response = await fetch(appsScriptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "upsert",
      sheetName,
      keyField,
      row: normalizeRow(row),
    }),
    cache: "no-store",
  });

  const result = await parseResponse(response);

  if (!response.ok || (result.success === false && result.ok === false)) {
    throw new Error(result.error || result.message || `${sheetName} save failed.`);
  }

  return result;
}