import type { Student } from "@/lib/dataService";

export type ExamSaveGroup = "march" | "june" | "september" | "csat";

type ExamScoreMap = Record<string, Partial<Student> | undefined>;

export const EXAM_SAVE_GROUPS: ExamSaveGroup[] = ["march", "june", "september", "csat"];

export const EXAM_TYPE_MAP: Record<ExamSaveGroup, string> = {
  march: "3mo",
  june: "6mo",
  september: "9mo",
  csat: "suneung",
};

export const EXAM_LABELS: Record<ExamSaveGroup, string> = {
  march: "3모",
  june: "6모",
  september: "9모",
  csat: "수능",
};

const EXAM_GROUP_ALIASES: Record<ExamSaveGroup, RegExp> = {
  march: /^(3모|3월|3mo|03mo|3-m|3_mock|EXAM\d{4}03)$/i,
  june: /^(6모|6월|6mo|06mo|6-m|6_mock|EXAM\d{4}06)$/i,
  september: /^(9모|9월|9mo|09mo|9-m|9_mock|EXAM\d{4}09)$/i,
  csat: /^(수능|suneung|sunung|csat|EXAM\d{4}11)$/i,
};

export const EXAM_SAVE_FIELD_KEYS: Array<keyof Student> = [
  "korean_name",
  "korean_raw",
  "korean_std",
  "korean_pct",
  "korean_grade",
  "math_name",
  "math_raw",
  "math_std",
  "math_pct",
  "math_grade",
  "english_raw",
  "english_grade",
  "inquiry1_name",
  "inquiry1_raw",
  "inquiry1_std",
  "inquiry1_pct",
  "inquiry1_grade",
  "inquiry2_name",
  "inquiry2_raw",
  "inquiry2_std",
  "inquiry2_pct",
  "inquiry2_grade",
  "history_raw",
  "history_grade",
];

function normalizeExamId(examId: string) {
  return String(examId || "").trim().toLowerCase();
}

export function getCanonicalExamId(group: ExamSaveGroup) {
  return EXAM_TYPE_MAP[group];
}

export function resolveExamSaveGroup(examId: string): ExamSaveGroup | null {
  const normalized = normalizeExamId(examId);

  if (!normalized) {
    return null;
  }

  const matchedGroup = (Object.keys(EXAM_GROUP_ALIASES) as ExamSaveGroup[]).find((group) =>
    EXAM_GROUP_ALIASES[group].test(normalized)
  );

  return matchedGroup || null;
}

export function hasSavedExamFields(scoreFields?: Partial<Student> | null) {
  if (!scoreFields) {
    return false;
  }

  return EXAM_SAVE_FIELD_KEYS.some((key) => String(scoreFields[key] ?? "").trim() !== "");
}

function extractExamScoreMap(
  source:
    | { exam_scores?: ExamScoreMap | null }
    | ExamScoreMap
    | null
    | undefined
): ExamScoreMap {
  if (!source || typeof source !== "object") {
    return {};
  }

  if ("exam_scores" in source) {
    return (source as { exam_scores?: ExamScoreMap | null }).exam_scores || {};
  }

  return source as ExamScoreMap;
}

export function hasExamSaved(
  source:
    | { exam_scores?: ExamScoreMap | null }
    | ExamScoreMap
    | null
    | undefined,
  group: ExamSaveGroup
) {
  const scoreMap = extractExamScoreMap(source);
  const canonicalExamId = getCanonicalExamId(group);

  const directMatch = hasSavedExamFields(scoreMap[canonicalExamId]);
  if (directMatch) {
    return true;
  }

  return Object.entries(scoreMap).some(([examId, scoreFields]) => {
    return resolveExamSaveGroup(examId) === group && hasSavedExamFields(scoreFields);
  });
}
