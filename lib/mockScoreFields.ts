import type { MockScore, Student } from "@/lib/dataService";

export const MOCK_SCORE_FIELD_KEYS = [
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
] as const satisfies ReadonlyArray<keyof Student>;

function s(value: unknown) {
  return String(value ?? "");
}

export function pickMockScoreFields(source?: Partial<Student> | Partial<MockScore> | null): Partial<Student> {
  const nextFields: Partial<Student> = {};

  MOCK_SCORE_FIELD_KEYS.forEach((key) => {
    nextFields[key] = s(source?.[key]);
  });

  return nextFields;
}
