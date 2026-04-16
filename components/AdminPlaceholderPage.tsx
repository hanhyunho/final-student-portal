import React from "react";
import { AdminHeader, type AdminNavKey } from "@/components/AdminHeader";
import { portalTheme } from "@/lib/theme";

interface AdminPlaceholderPageProps {
  title: string;
  subtitle: string;
  accent: string;
  headerActiveKey: AdminNavKey;
}

export function AdminPlaceholderPage({ title, subtitle, accent, headerActiveKey }: AdminPlaceholderPageProps) {
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <AdminHeader isSuperAdmin fallbackActiveKey={headerActiveKey} />

        <section style={{ ...styles.hero, borderLeft: `6px solid ${accent}` }}>
          <div>
            <p style={{ ...styles.eyebrow, color: accent }}>준비 중인 메뉴</p>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>{subtitle}</p>
          </div>
        </section>

        <section style={styles.grid}>
          <article style={styles.card}>
            <h2 style={styles.cardTitle}>화면 뼈대 완료</h2>
            <p style={styles.cardText}>상단 그룹형 메뉴와 라우팅 자리는 연결되어 있으므로 이후 실제 기능만 붙이면 됩니다.</p>
          </article>
          <article style={styles.card}>
            <h2 style={styles.cardTitle}>다음 연결 예정</h2>
            <p style={styles.cardText}>필터, 목록, 상세 카드, 통계 패널 등 실제 콘텐츠는 후속 작업에서 이 페이지에 맞춰 확장하면 됩니다.</p>
          </article>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: portalTheme.gradients.page,
    padding: "0 20px 40px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1360px",
    margin: "0 auto",
    paddingTop: "16px",
  },
  hero: {
    background: portalTheme.gradients.card,
    borderRadius: "24px",
    border: `1px solid ${portalTheme.colors.line}`,
    padding: "28px 30px",
    boxShadow: portalTheme.shadows.panel,
    marginBottom: "18px",
  },
  eyebrow: {
    margin: "0 0 8px 0",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.12em",
  },
  title: {
    margin: 0,
    fontSize: "clamp(40px, 6vw, 58px)",
    lineHeight: 1.02,
    fontWeight: 900,
    letterSpacing: "-0.05em",
    color: portalTheme.colors.textStrong,
  },
  subtitle: {
    margin: "14px 0 0 0",
    fontSize: "16px",
    lineHeight: 1.7,
    color: portalTheme.colors.textMuted,
    maxWidth: "760px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  card: {
    background: portalTheme.gradients.card,
    borderRadius: "20px",
    border: `1px solid ${portalTheme.colors.line}`,
    boxShadow: portalTheme.shadows.card,
    padding: "22px 24px",
  },
  cardTitle: {
    margin: "0 0 10px 0",
    fontSize: "20px",
    fontWeight: 900,
    color: portalTheme.colors.textStrong,
  },
  cardText: {
    margin: 0,
    color: portalTheme.colors.textMuted,
    fontSize: "14px",
    lineHeight: 1.7,
  },
};
