import React from "react";
import { StudentModeTabs } from "@/components/StudentModeTabs";

interface StudentConsultTabsProps {
  value: string;
  onChange: (value: string) => void;
}

export function StudentConsultTabs({ value, onChange }: StudentConsultTabsProps) {
  return (
    <StudentModeTabs
      title="상담"
      description="상담 기록과 단계별 상담 입력 상태를 연결할 예정입니다."
      tabs={["기본", "3모", "6모", "9모", "수능"]}
      value={value}
      onChange={onChange}
      accent="green"
    />
  );
}