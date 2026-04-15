export type ConsultType = "basic" | "mock3" | "mock6" | "mock9" | "csat";

export const CONSULT_TYPE_LABELS: Record<ConsultType, string> = {
  basic: "기본 상담",
  mock3: "3모 상담",
  mock6: "6모 상담",
  mock9: "9모 상담",
  csat: "수능 상담",
};

export const CONSULT_TYPE_SHORT: Record<ConsultType, string> = {
  basic: "기본",
  mock3: "3모",
  mock6: "6모",
  mock9: "9모",
  csat: "수능",
};

export const CONSULT_TYPES: ConsultType[] = ["basic", "mock3", "mock6", "mock9", "csat"];

const TAB_TO_TYPE: Record<string, ConsultType> = {
  기본: "basic",
  "3모": "mock3",
  "6모": "mock6",
  "9모": "mock9",
  수능: "csat",
};

export function resolveConsultType(tab: string): ConsultType {
  return TAB_TO_TYPE[tab] ?? "basic";
}
