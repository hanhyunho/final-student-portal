export const DEFAULT_UNIVERSITY_THEME = "#1e3a8a";

export const universityThemeMap: Record<string, string> = {
  국민대학교: "#005BAC",
  단국대학교: "#1D4ED8",
  가천대학교: "#EA4335",
  경기대학교: "#F97316",
  고려대학교: "#7F1D1D",
  연세대학교: "#0F766E",
  한양대학교: "#EA580C",
  경희대학교: "#0F4C81",
  강원대학교: "#2563EB",
  건국대학교: "#16A34A",
  가톨릭관동대학교: "#0F766E",
  중앙대학교: "#1D4ED8",
  성균관대학교: "#0F766E",
  순천향대학교: "#2563EB",
  한국체육대학교: "#15803D",
  이화여자대학교: "#16A34A",
  동덕여자대학교: "#D97706",
};

export function getUniversityThemeColor(university: string) {
  return universityThemeMap[university] ?? DEFAULT_UNIVERSITY_THEME;
}
