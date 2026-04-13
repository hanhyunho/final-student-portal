import type {
  Branch,
  MockExam,
  MockScore,
  PhysicalRecord,
  PhysicalTest,
  Student,
} from "@/lib/dataService";

export type ScoreRankingMetric = "five-subject-total" | "three-subject-total";

export type PhysicalRankingMetric =
  | "total_score"
  | "back_strength_value"
  | "run_10m_value"
  | "medicine_ball_value"
  | "sit_reach_value"
  | "standing_jump_value"
  | "run_20m_value";

export type GenderFilter = "all" | "male" | "female";

export type FilterOption = {
  value: string;
  label: string;
  helper?: string;
};

export type ScoreRankingItem = {
  studentId: string;
  studentName: string;
  branchLabel: string;
  examLabel: string;
  metricLabel: string;
  value: number;
};

export type PhysicalRankingItem = {
  studentId: string;
  studentName: string;
  branchLabel: string;
  genderLabel: string;
  testLabel: string;
  metricLabel: string;
  value: number;
};

export type BranchPhysicalComparisonItem = {
  branchId: string;
  branchLabel: string;
  metricLabel: string;
  value: number;
  sourceCount: number;
  includedCount: number;
};

const PHYSICAL_METRIC_META: Record<
  PhysicalRankingMetric,
  { label: string; sortDirection: "asc" | "desc"; decimals: number }
> = {
  total_score: { label: "실기 총점", sortDirection: "desc", decimals: 1 },
  back_strength_value: { label: "배근력", sortDirection: "desc", decimals: 1 },
  run_10m_value: { label: "10m 왕복달리기", sortDirection: "asc", decimals: 2 },
  medicine_ball_value: { label: "메디신볼", sortDirection: "desc", decimals: 1 },
  sit_reach_value: { label: "좌전굴", sortDirection: "desc", decimals: 1 },
  standing_jump_value: { label: "제자리멀리뛰기", sortDirection: "desc", decimals: 1 },
  run_20m_value: { label: "20m 왕복달리기", sortDirection: "asc", decimals: 2 },
};

const SCORE_METRIC_META: Record<ScoreRankingMetric, { label: string }> = {
  "five-subject-total": { label: "국영수탐1탐2 합산" },
  "three-subject-total": { label: "국영수 합산" },
};

function s(value: unknown) {
  return String(value ?? "").trim();
}

function toNumber(value: unknown) {
  const numericValue = Number(value ?? 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function compareUpdatedAt(left: { updated_at?: string; created_at?: string }, right: { updated_at?: string; created_at?: string }) {
  const leftValue = s(left.updated_at) || s(left.created_at);
  const rightValue = s(right.updated_at) || s(right.created_at);
  return leftValue.localeCompare(rightValue);
}

function normalizeGender(value: unknown): GenderFilter | "" {
  const normalizedValue = s(value).toLowerCase();

  if (!normalizedValue) {
    return "";
  }

  if (normalizedValue.includes("female") || normalizedValue === "f" || normalizedValue.includes("여")) {
    return "female";
  }

  if (normalizedValue.includes("male") || normalizedValue === "m" || normalizedValue.includes("남")) {
    return "male";
  }

  return "";
}

function getGenderLabel(value: unknown) {
  const gender = normalizeGender(value);

  if (gender === "female") {
    return "여";
  }

  if (gender === "male") {
    return "남";
  }

  return "미상";
}

function matchesGenderFilter(value: unknown, genderFilter: GenderFilter) {
  if (genderFilter === "all") {
    return true;
  }

  return normalizeGender(value) === genderFilter;
}

export function getSortableDateValue(rawDate: unknown) {
  const normalizedDate = s(rawDate);
  const dateMatch = normalizedDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!dateMatch) {
    return -1;
  }

  return Number(`${dateMatch[1]}${dateMatch[2].padStart(2, "0")}${dateMatch[3].padStart(2, "0")}`);
}

export function buildCompactMonthLabel(rawDate: unknown) {
  const normalizedDate = s(rawDate);
  const dateMatch = normalizedDate.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);

  if (!dateMatch) {
    return normalizedDate || "날짜 없음";
  }

  return `${dateMatch[1].slice(2)}년 ${Number(dateMatch[2])}월`;
}

function buildBranchLabelMap(branches: Branch[]) {
  return new Map(branches.map((branch) => [s(branch.branch_id), s(branch.branch_name) || s(branch.branch_id)]));
}

function pickLatestMockScores(scores: MockScore[]) {
  const byStudentId = new Map<string, MockScore>();

  scores.forEach((score) => {
    const studentId = s(score.student_id);
    if (!studentId) {
      return;
    }

    const existing = byStudentId.get(studentId);
    if (!existing || compareUpdatedAt(score, existing) > 0) {
      byStudentId.set(studentId, score);
    }
  });

  return Array.from(byStudentId.values());
}

function pickLatestPhysicalRecords(records: PhysicalRecord[]) {
  const byStudentId = new Map<string, PhysicalRecord>();

  records.forEach((record) => {
    const studentId = s(record.student_id);
    if (!studentId) {
      return;
    }

    const existing = byStudentId.get(studentId);
    if (!existing || compareUpdatedAt(record, existing) > 0) {
      byStudentId.set(studentId, record);
    }
  });

  return Array.from(byStudentId.values());
}

function getScoreMetricValue(score: MockScore, metric: ScoreRankingMetric) {
  const korean = toNumber(score.korean_raw);
  const math = toNumber(score.math_raw);
  const english = toNumber(score.english_raw);

  if (metric === "three-subject-total") {
    return korean + math + english;
  }

  return korean + math + english + toNumber(score.inquiry1_raw) + toNumber(score.inquiry2_raw);
}

function getPhysicalMetricValue(record: PhysicalRecord, metric: PhysicalRankingMetric) {
  if (metric === "total_score") {
    return toNumber(record.total_score);
  }

  return toNumber(record[metric]);
}

function sortByMetric<T extends { value: number }>(items: T[], direction: "asc" | "desc") {
  return [...items].sort((left, right) => {
    if (direction === "asc") {
      return left.value - right.value;
    }

    return right.value - left.value;
  });
}

function trimBottomThirtyPercent(values: number[], direction: "asc" | "desc") {
  if (values.length === 0) {
    return [];
  }

  const sortedValues = [...values].sort((left, right) => {
    if (direction === "asc") {
      return left - right;
    }

    return right - left;
  });
  const keepCount = Math.max(1, Math.ceil(sortedValues.length * 0.7));
  return sortedValues.slice(0, keepCount);
}

export function getScoreMetricOptions(): FilterOption[] {
  return [
    { value: "five-subject-total", label: SCORE_METRIC_META["five-subject-total"].label },
    { value: "three-subject-total", label: SCORE_METRIC_META["three-subject-total"].label },
  ];
}

export function getPhysicalMetricOptions(): FilterOption[] {
  return Object.entries(PHYSICAL_METRIC_META).map(([value, meta]) => ({
    value,
    label: meta.label,
  }));
}

export function getGenderFilterOptions(): FilterOption[] {
  return [
    { value: "all", label: "남녀" },
    { value: "male", label: "남" },
    { value: "female", label: "여" },
  ];
}

export function getMockExamOptions(mockScores: MockScore[], mockExams: MockExam[]): FilterOption[] {
  const examsById = new Map(mockExams.map((exam) => [s(exam.exam_id), exam]));
  const examIds = Array.from(new Set(mockScores.map((score) => s(score.exam_id)).filter(Boolean)));

  return examIds
    .map((examId) => {
      const exam = examsById.get(examId);
      const compactDate = buildCompactMonthLabel(exam?.exam_date);
      return {
        value: examId,
        label: s(exam?.exam_name) || compactDate,
        helper: compactDate,
        sortValue: getSortableDateValue(exam?.exam_date),
      };
    })
    .sort((left, right) => right.sortValue - left.sortValue)
    .map((option) => ({ value: option.value, label: option.label, helper: option.helper }));
}

export function getPhysicalTestOptions(physicalRecords: PhysicalRecord[], physicalTests: PhysicalTest[]): FilterOption[] {
  const testsById = new Map(physicalTests.map((test) => [s(test.test_id), test]));
  const testIds = Array.from(new Set(physicalRecords.map((record) => s(record.test_id)).filter(Boolean)));

  return testIds
    .map((testId) => {
      const test = testsById.get(testId);
      const compactDate = buildCompactMonthLabel(s(test?.test_date) || s(test?.exam_date));
      return {
        value: testId,
        label: compactDate,
        helper: s(test?.test_name) || compactDate,
        sortValue: getSortableDateValue(s(test?.test_date) || s(test?.exam_date)),
      };
    })
    .sort((left, right) => right.sortValue - left.sortValue)
    .map((option) => ({ value: option.value, label: option.label, helper: option.helper }));
}

export function buildScoreRankings({
  branches,
  students,
  mockExams,
  mockScores,
  examId,
  metric,
  limit = 5,
}: {
  branches: Branch[];
  students: Student[];
  mockExams: MockExam[];
  mockScores: MockScore[];
  examId: string;
  metric: ScoreRankingMetric;
  limit?: number;
}): ScoreRankingItem[] {
  const branchLabelMap = buildBranchLabelMap(branches);
  const studentById = new Map(students.map((student) => [s(student.student_id), student]));
  const examsById = new Map(mockExams.map((exam) => [s(exam.exam_id), exam]));
  const selectedExam = examsById.get(s(examId));
  const examLabel = s(selectedExam?.exam_name) || buildCompactMonthLabel(selectedExam?.exam_date) || s(examId);

  return sortByMetric(
    pickLatestMockScores(mockScores.filter((score) => s(score.exam_id) === s(examId)))
      .map((score) => {
        const student = studentById.get(s(score.student_id));
        const value = getScoreMetricValue(score, metric);

        return {
          studentId: s(score.student_id),
          studentName: s(student?.name) || s(score.student_name) || "이름 없음",
          branchLabel: branchLabelMap.get(s(student?.branch_id) || s(score.branch_id)) || s(student?.branch_id) || s(score.branch_id) || "지점 미지정",
          examLabel,
          metricLabel: SCORE_METRIC_META[metric].label,
          value,
        } satisfies ScoreRankingItem;
      })
      .filter((item) => item.value > 0),
    "desc"
  ).slice(0, limit);
}

export function buildPhysicalRankings({
  branches,
  students,
  physicalRecords,
  physicalTests,
  testId,
  genderFilter,
  metric,
  limit = 5,
}: {
  branches: Branch[];
  students: Student[];
  physicalRecords: PhysicalRecord[];
  physicalTests: PhysicalTest[];
  testId: string;
  genderFilter: GenderFilter;
  metric: PhysicalRankingMetric;
  limit?: number;
}): PhysicalRankingItem[] {
  const branchLabelMap = buildBranchLabelMap(branches);
  const studentById = new Map(students.map((student) => [s(student.student_id), student]));
  const testsById = new Map(physicalTests.map((test) => [s(test.test_id), test]));
  const selectedTest = testsById.get(s(testId));
  const testLabel = buildCompactMonthLabel(s(selectedTest?.test_date) || s(selectedTest?.exam_date));
  const metricMeta = PHYSICAL_METRIC_META[metric];

  return sortByMetric(
    pickLatestPhysicalRecords(physicalRecords.filter((record) => s(record.test_id) === s(testId)))
      .map((record) => {
        const student = studentById.get(s(record.student_id));
        const value = getPhysicalMetricValue(record, metric);

        return {
          studentId: s(record.student_id),
          studentName: s(student?.name) || s(record.student_name) || "이름 없음",
          branchLabel: branchLabelMap.get(s(student?.branch_id) || s(record.branch_id)) || s(student?.branch_id) || s(record.branch_id) || "지점 미지정",
          genderLabel: getGenderLabel(student?.gender),
          testLabel,
          metricLabel: metricMeta.label,
          value,
          gender: student?.gender,
        };
      })
      .filter((item) => item.value > 0 && matchesGenderFilter(item.gender, genderFilter))
      .map((item) => {
        const { gender, ...rest } = item;
        void gender;
        return rest as PhysicalRankingItem;
      }),
    metricMeta.sortDirection
  ).slice(0, limit);
}

export function buildBranchPhysicalComparison({
  branches,
  students,
  physicalRecords,
  physicalTests,
  testId,
  genderFilter,
  metric,
}: {
  branches: Branch[];
  students: Student[];
  physicalRecords: PhysicalRecord[];
  physicalTests: PhysicalTest[];
  testId: string;
  genderFilter: GenderFilter;
  metric: PhysicalRankingMetric;
}): BranchPhysicalComparisonItem[] {
  const branchLabelMap = buildBranchLabelMap(branches);
  const studentById = new Map(students.map((student) => [s(student.student_id), student]));
  const testsById = new Map(physicalTests.map((test) => [s(test.test_id), test]));
  const metricMeta = PHYSICAL_METRIC_META[metric];
  const selectedTest = testsById.get(s(testId));
  void selectedTest;

  const branchValues = new Map<string, number[]>();

  pickLatestPhysicalRecords(physicalRecords.filter((record) => s(record.test_id) === s(testId))).forEach((record) => {
    const student = studentById.get(s(record.student_id));

    if (!matchesGenderFilter(student?.gender, genderFilter)) {
      return;
    }

    const value = getPhysicalMetricValue(record, metric);
    if (value <= 0) {
      return;
    }

    const branchId = s(student?.branch_id) || s(record.branch_id);
    if (!branchId) {
      return;
    }

    const nextValues = branchValues.get(branchId) || [];
    nextValues.push(value);
    branchValues.set(branchId, nextValues);
  });

  return branches
    .map((branch) => {
      const branchId = s(branch.branch_id);
      const values = branchValues.get(branchId) || [];
      const filteredValues = trimBottomThirtyPercent(values, metricMeta.sortDirection);
      const average =
        filteredValues.length === 0
          ? 0
          : filteredValues.reduce((sum, value) => sum + value, 0) / filteredValues.length;

      return {
        branchId,
        branchLabel: branchLabelMap.get(branchId) || branchId,
        metricLabel: metricMeta.label,
        value: Number(average.toFixed(metricMeta.decimals)),
        sourceCount: values.length,
        includedCount: filteredValues.length,
      } satisfies BranchPhysicalComparisonItem;
    })
    .sort((left, right) => {
      if (left.includedCount === 0 && right.includedCount === 0) {
        return left.branchLabel.localeCompare(right.branchLabel, "ko");
      }

      if (left.includedCount === 0) {
        return 1;
      }

      if (right.includedCount === 0) {
        return -1;
      }

      if (metricMeta.sortDirection === "asc") {
        return left.value - right.value;
      }

      return right.value - left.value;
    });
}

export function getPhysicalMetricMeta(metric: PhysicalRankingMetric) {
  return PHYSICAL_METRIC_META[metric];
}

export function formatMetricValue(metric: ScoreRankingMetric | PhysicalRankingMetric, value: number) {
  if (metric in SCORE_METRIC_META) {
    return value.toFixed(0);
  }

  const physicalMetric = metric as PhysicalRankingMetric;
  return value.toFixed(PHYSICAL_METRIC_META[physicalMetric].decimals);
}