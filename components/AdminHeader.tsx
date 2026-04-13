"use client";

import Link from "next/link";
import React, { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { portalLayout } from "@/lib/theme";

type AdminNavKey =
  | "student-management"
  | "branch-analysis"
  | "branch-management"
  | "regular-program"
  | "early-program"
  | "regular-guide"
  | "early-guide"
  | "regular-data"
  | "early-data";

type MenuItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  adminOnly?: boolean;
};

const menuSections: Array<{ label: string; items: MenuItem[] }> = [
  {
    label: "메인",
    items: [
      { key: "student-management", label: "지점 학생 관리", href: "/?view=student-management" },
      { key: "branch-analysis", label: "지점별 비교 분석", href: "/?view=branch-analysis" },
      { key: "branch-management", label: "지점관리", href: "/branches", adminOnly: true },
    ],
  },
  {
    label: "프로그램",
    items: [
      { key: "regular-program", label: "정시프로그램", href: "/programs/regular" },
      { key: "early-program", label: "수시프로그램", href: "/programs/early" },
    ],
  },
  {
    label: "대학별입시요강",
    items: [
      { key: "regular-guide", label: "정시입시요강", href: "/guides/regular" },
      { key: "early-guide", label: "수시입시요강", href: "/guides/early" },
    ],
  },
  {
    label: "수합자료/실시간순위",
    items: [
      { key: "regular-data", label: "정시DATA", href: "/jeongsi-data" },
      { key: "early-data", label: "수시DATA", href: "/susi-data" },
    ],
  },
];

interface AdminHeaderProps {
  isSuperAdmin?: boolean;
  actions?: React.ReactNode;
  fallbackActiveKey?: AdminNavKey;
}

type AdminHeaderShellProps = {
  isSuperAdmin: boolean;
  actions: React.ReactNode;
  activeKey: AdminNavKey;
};

export function AdminHeader({ isSuperAdmin = false, actions = null, fallbackActiveKey = "student-management" }: AdminHeaderProps) {
  return (
    <Suspense
      fallback={
        <AdminHeaderShell
          isSuperAdmin={isSuperAdmin}
          actions={actions}
          activeKey={fallbackActiveKey}
        />
      }
    >
      <AdminHeaderContent isSuperAdmin={isSuperAdmin} actions={actions} />
    </Suspense>
  );
}

function AdminHeaderContent({ isSuperAdmin = false, actions = null }: AdminHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeKey = resolveActiveKey(pathname, searchParams.get("view"));

  return <AdminHeaderShell isSuperAdmin={isSuperAdmin} actions={actions} activeKey={activeKey} />;
}

function AdminHeaderShell({ isSuperAdmin, actions, activeKey }: AdminHeaderShellProps) {
  return (
    <header style={styles.shell}>
      <div style={styles.topRow}>
        <div style={styles.brandBlock}>
          <p style={styles.brandEyebrow}>FINAL SPORTS ACADEMY</p>
          <h1 style={styles.brandTitle}>FINAL 관리자 시스템</h1>
          <p style={styles.brandCaption}>메인, 프로그램, 입시요강, 데이터 메뉴를 그룹형 네비게이션으로 정리해 현재 화면과 자연스럽게 연결했습니다.</p>
        </div>
        {actions ? <div style={styles.actionsWrap}>{actions}</div> : null}
      </div>

      <div style={styles.menuSurface}>
        {menuSections.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isSuperAdmin);

          if (visibleItems.length === 0) {
            return null;
          }

          return (
            <section key={section.label} style={styles.menuGroup}>
              <div style={styles.groupLabel}>{section.label}</div>
              <div style={styles.groupItems}>
                {visibleItems.map((item) => {
                  const isActive = item.key === activeKey;

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      style={{
                        ...styles.menuItem,
                        ...(isActive ? styles.menuItemActive : styles.menuItemInactive),
                      }}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </header>
  );
}

function resolveActiveKey(pathname: string, dashboardView: string | null): AdminNavKey {
  if (pathname === "/branches") {
    return "branch-management";
  }

  if (pathname === "/programs/regular") {
    return "regular-program";
  }

  if (pathname === "/programs/early") {
    return "early-program";
  }

  if (pathname === "/guides/regular") {
    return "regular-guide";
  }

  if (pathname === "/guides/early") {
    return "early-guide";
  }

  if (pathname === "/jeongsi-data") {
    return "regular-data";
  }

  if (pathname === "/susi-data") {
    return "early-data";
  }

  return dashboardView === "branch-analysis" ? "branch-analysis" : "student-management";
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    marginBottom: "24px",
    padding: "26px 30px 24px",
    borderRadius: "30px",
    background: "linear-gradient(180deg, #153d72 0%, #11325f 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 14px 34px rgba(11, 31, 58, 0.18)",
    color: "#ffffff",
  },
  topRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
    marginBottom: "20px",
  },
  brandBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minWidth: 0,
    flex: "1 1 560px",
  },
  brandEyebrow: {
    margin: 0,
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.18em",
    color: "rgba(219, 234, 254, 0.82)",
  },
  brandTitle: {
    margin: 0,
    fontSize: "clamp(28px, 3vw, 38px)",
    lineHeight: 1.1,
    fontWeight: 900,
    letterSpacing: "-0.04em",
    color: "#ffffff",
  },
  brandCaption: {
    margin: 0,
    maxWidth: portalLayout.containerMaxWidth,
    fontSize: "14px",
    lineHeight: 1.7,
    color: "rgba(226, 232, 240, 0.88)",
  },
  actionsWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "10px",
    flexWrap: "wrap",
    flex: "0 1 auto",
  },
  menuSurface: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px 22px",
    alignItems: "start",
  },
  menuGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    minWidth: 0,
  },
  groupLabel: {
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.14em",
    color: "rgba(219, 234, 254, 0.76)",
  },
  groupItems: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  menuItem: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "42px",
    padding: "10px 16px",
    borderRadius: "999px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: 800,
    transition: "background-color 160ms ease, color 160ms ease, box-shadow 160ms ease",
    whiteSpace: "nowrap",
  },
  menuItemActive: {
    color: "#f8fbff",
    background: "linear-gradient(135deg, rgba(244, 63, 94, 0.92) 0%, rgba(217, 45, 32, 0.92) 100%)",
    boxShadow: "0 10px 20px rgba(217, 45, 32, 0.18)",
  },
  menuItemInactive: {
    color: "#eff6ff",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};