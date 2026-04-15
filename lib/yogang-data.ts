export type YogangCategoryMain = "수시" | "정시";

export type YogangCategorySub =
  | "교과"
  | "종합"
  | "실기"
  | "논술"
  | "면접"
  | "가군"
  | "나군"
  | "다군";

export interface YogangCard {
  card_id: string;
  card_title: string;
  card_subtitle: string;
  recruit_count: string;
  region: string;
  campus: string;
  category_main: YogangCategoryMain;
  category_sub: YogangCategorySub;
  has_silgi: "Y" | "N";
}

export interface YogangDetail {
  card_id: string;
  university: string;
  department: string;
  category_main: YogangCategoryMain;
  category_sub: YogangCategorySub;
  admission_title: string;
  eligibility: string;
  selection_summary: string;
  csat_reflection: string;
  student_record_reflection: string;
  interview: string;
  essay: string;
  silgi_note: string;
  schedule_apply: string;
  schedule_doc: string;
  schedule_test: string;
  schedule_pass: string;
  notes: string;
  source_url: string;
}

export interface YogangSilgiRow {
  card_id: string;
  event_order: number;
  event_name: string;
  criteria_1: string;
  score_1: string;
  criteria_2: string;
  score_2: string;
  criteria_3: string;
  score_3: string;
  remarks: string;
}

export interface YogangDataset {
  cards: YogangCard[];
  details: YogangDetail[];
  silgiRows: YogangSilgiRow[];
}
