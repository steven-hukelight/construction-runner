"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import { getRoleFromClient } from "@/lib/utils/cookies";
import { useClientSession } from "../ClientSessionProvider";
import { useNearMissCount } from "../NearMissCountProvider";
import { useAutoPausedCount } from "../AutoPausedCountProvider";
import { canRoleViewNearMiss } from "@/lib/auth/nearMissRoles";
import {
  HEALTH_AND_SAFETY_HREF,
  healthAndSafetyGroupsForRole,
  isHealthAndSafetyPath,
  isHealthAndSafetyTabActive,
} from "@/lib/healthAndSafety/nav";
import { usePolling } from "@/lib/hooks/usePolling";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Package,
  Boxes,
  ListTodo,
  MessageSquare,
  Settings,
  Menu,
  X,
  HardHat,
  MapPin,
  Users,
  ClipboardCheck,
  Building2,
  ClipboardList,
  UserCheck,
  ChevronRight,
} from "lucide-react";

import { preInductionUiEnabled } from "@/lib/featureFlags";
import { sidebarHrefVisible } from "@/lib/auth/sidebarNav";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

// Admin/Supervisor: Sites, Subcontractors, [Induction compliance], Users (includes missing details), pending signups, Attendance
const adminNavItems = [
  { name: "Sites", href: "/dashboard/sites", icon: MapPin },
  { name: "Subcontractors", href: "/dashboard/subcontractors", icon: Building2 },
  ...(preInductionUiEnabled
    ? [
        {
          name: "Induction compliance",
          href: "/dashboard/induction-compliance",
          icon: ClipboardCheck,
        },
      ]
    : []),
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Pending approvals", href: "/dashboard/pending-approvals", icon: UserCheck },
  { name: "Attendance", href: "/dashboard/attendance", icon: ClipboardList },
];

type SidebarProps = {
  role?: string | null;
};

const topLevelItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Deliveries", href: "/dashboard/deliveries", icon: Package },
  { name: "Assets", href: "/dashboard/assets", icon: Boxes },
  { name: "Messages", href: "/dashboard/messaging", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const subAdminNavItem = { name: "Operative onboarding", href: "/dashboard/subcontractor", icon: FileText };

export default function Sidebar({ role }: SidebarProps) {
  const { t } = useDisplayPreferences();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { impersonating, role: sessionRole } = useClientSession();
  const isSuperuserSession = (sessionRole ?? role ?? "").toLowerCase() === "superuser";
  const inCompanyView = !isSuperuserSession || impersonating;
  const rawNearMissCount = useNearMissCount();
  const canViewNearMiss = canRoleViewNearMiss(sessionRole);
  const nearMissCount = canViewNearMiss ? rawNearMissCount : 0;
  const autoPausedCount = useAutoPausedCount();
  const [hsExpanded, setHsExpanded] = useState(() => isHealthAndSafetyPath(pathname));
  const [pendingApprovalsBadge, setPendingApprovalsBadge] = useState(0);

  const loadPendingApprovalsBadge = useCallback(async (signal: AbortSignal) => {
    const r = (getRoleFromClient() ?? "").toLowerCase();
    if (!["admin", "supervisor", "sub_admin", "superuser", "site_admin"].includes(r)) return;
    const res = await fetch("/api/auth/registrations?count=1", { cache: "no-store", credentials: "include", signal });
    if (!res.ok) return;
    const d = await res.json();
    if (!signal.aborted) setPendingApprovalsBadge(typeof d?.count === "number" ? d.count : 0);
  }, []);
  // Poll occasionally; do NOT refetch on every client navigation, that was
  // doubling API load across the whole dashboard shell.
  const fetchPendingApprovalsBadge = usePolling(loadPendingApprovalsBadge, 120_000);

  useEffect(() => {
    window.addEventListener("pending-approvals-changed", fetchPendingApprovalsBadge);
    return () => {
      window.removeEventListener("pending-approvals-changed", fetchPendingApprovalsBadge);
    };
  }, [fetchPendingApprovalsBadge]);

  const showAdminNav =
    inCompanyView &&
    ["admin", "ADMIN", "site_admin", "supervisor", "SUPERVISOR", "sub_admin"].includes(role ?? "");

  const healthAndSafetyOpen = isHealthAndSafetyPath(pathname);
  const hsGroups = healthAndSafetyGroupsForRole(canViewNearMiss);

  useEffect(() => {
    setHsExpanded(healthAndSafetyOpen);
  }, [healthAndSafetyOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  const healthAndSafetyLink = (
    <div>
      <div className="flex items-stretch">
        <Link
          href={HEALTH_AND_SAFETY_HREF}
          className={`!w-auto min-w-0 flex-1 ${healthAndSafetyOpen ? "active" : ""} ${nearMissCount > 0 ? "!pr-2" : ""}`}
          onClick={() => {
            setHsExpanded(true);
            setMobileMenuOpen(false);
          }}
        >
          <HardHat size={20} strokeWidth={2.5} />
          <span className="min-w-0 flex-1">{t("Health & safety")}</span>
          {nearMissCount > 0 && (
            <span
              className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-medium text-white"
              aria-label={`${nearMissCount} unreviewed near misses`}
            >
              {nearMissCount > 99 ? "99+" : nearMissCount}
            </span>
          )}
        </Link>
        <button
          type="button"
          className="sidebar-disclosure"
          aria-expanded={hsExpanded}
          aria-label={hsExpanded ? "Collapse health and safety" : "Expand health and safety"}
          onClick={() => setHsExpanded((open) => !open)}
        >
          <ChevronRight
            size={14}
            strokeWidth={2.25}
            className={`text-gray-400 ${hsExpanded ? "rotate-90 text-blue-500" : ""}`}
            aria-hidden
          />
        </button>
      </div>
      {hsExpanded && (
        <div className="sidebar-subnav">
          {hsGroups.map((group) => (
            <div key={group.name}>
              <p className="sidebar-subnav-label">{t(group.name)}</p>
              {group.tabs.map((tab) => {
                const active = isHealthAndSafetyTabActive(pathname, tab.href);
                const badge =
                  tab.showNearMissCount && nearMissCount > 0
                    ? nearMissCount
                    : tab.showAutoPausedCount && autoPausedCount > 0
                      ? autoPausedCount
                      : null;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={active ? "active" : ""}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="min-w-0 flex-1">{t(tab.name)}</span>
                    {badge != null && (
                      <span
                        className="flex h-4 min-w-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white"
                        aria-label={`${badge}`}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button - only visible on mobile */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="mobile-menu-btn fixed top-5 left-5 z-50 rounded-lg bg-slate-800 p-2.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileMenuOpen && (
        <div
          className="mobile-menu-btn fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}

      <aside 
        className={`sidebar flex flex-col ${
          mobileMenuOpen ? 'mobile-menu-open' : ''
        }`}
        style={mobileMenuOpen ? { transform: 'translateX(0)' } : {}}
      >
        {/* Top: logo + back button + label, no scroll */}
        <div className="shrink-0">
          <div className="logo flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <Image src="/icon.png?v=3" alt="Construction Runner logo" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" unoptimized />
            <span>Construction<br />Runner</span>
          </div>

          {/* Back to Superuser when impersonating */}
          {impersonating && (
            <div className="px-3 mb-4">
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/stop-impersonate", { method: "POST", credentials: "include" });
                  window.location.href = "/dashboard/superuser-dashboard";
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-800 font-semibold border border-amber-200 hover:bg-amber-100 transition-colors duration-[120ms] text-sm"
                title="Stop impersonating and return to Superuser"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="shrink-0"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to Superuser
              </button>
            </div>
          )}
        </div>

        {/* Nav: fills remaining space and scrolls so tabs are never behind help */}
        <nav className="sidebar-nav flex-1 min-h-0 overflow-y-auto pr-2">
          {inCompanyView && (
          <Link
            href="/dashboard"
            className={
              pathname === "/dashboard" ||
              pathname === "/dashboard/admin-dashboard" ||
              pathname === "/dashboard/supervisor-dashboard" ||
              Boolean(pathname?.startsWith("/dashboard/supervisor-dashboard/"))
                ? "active"
                : ""
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            <LayoutDashboard size={20} strokeWidth={2.5} />
            <span>{t("Dashboard")}</span>
          </Link>
          )}
          {role === "sub_admin" && preInductionUiEnabled && (
            <Link
              href={subAdminNavItem.href}
              className={pathname === subAdminNavItem.href ? "active" : ""}
              onClick={() => setMobileMenuOpen(false)}
            >
              <subAdminNavItem.icon size={20} strokeWidth={2.5} />
              <span>{t(subAdminNavItem.name)}</span>
            </Link>
          )}
          {showAdminNav &&
            adminNavItems.filter((item) => sidebarHrefVisible(role, item.href)).map((item) => {
              const active =
                pathname === item.href ||
                pathname?.startsWith(item.href + "/") ||
                (item.href === "/dashboard/users" && pathname?.startsWith("/dashboard/operatives"));
              const Icon = item.icon;
              const showPendingBadge =
                item.href === "/dashboard/pending-approvals" && pendingApprovalsBadge > 0;
              return (
                <Fragment key={item.href}>
                  <Link
                    href={item.href}
                    className={`${active ? "active" : ""} ${showPendingBadge ? "!pr-2" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon size={20} strokeWidth={2.5} />
                    <span className="flex-1 min-w-0">{t(item.name)}</span>
                    {showPendingBadge && (
                      <span
                        className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
                        aria-label={`${pendingApprovalsBadge} pending approvals`}
                      >
                        {pendingApprovalsBadge > 99 ? "99+" : pendingApprovalsBadge}
                      </span>
                    )}
                  </Link>
                  {item.href === "/dashboard/sites" && healthAndSafetyLink}
                </Fragment>
              );
            })}
          {["operative", "OPERATIVE"].includes(role ?? "") ? (
            <>
              <Link href="/dashboard/attendance" className={pathname === "/dashboard/attendance" ? "active" : ""} onClick={() => setMobileMenuOpen(false)}>
                <ClipboardList size={20} strokeWidth={2.5} />
                <span>{t("Attendance")}</span>
              </Link>
              {preInductionUiEnabled ? (
                <Link href="/dashboard/induction-compliance" className={pathname === "/dashboard/induction-compliance" ? "active" : ""} onClick={() => setMobileMenuOpen(false)}>
                  <ClipboardCheck size={20} strokeWidth={2.5} />
                  <span>{t("Induction compliance")}</span>
                </Link>
              ) : null}
            </>
          ) : null}
          {inCompanyView &&
            topLevelItems.slice(1, 5).map((item) => {
            const active = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>{t(item.name)}</span>
              </Link>
            );
          })}
          {inCompanyView && !showAdminNav && healthAndSafetyLink}
          {inCompanyView &&
            topLevelItems.slice(5, 7).map((item) => {
            const active = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>{t(item.name)}</span>
              </Link>
            );
          })}
        </nav>

        {/* Help block: fixed at bottom, never overlaps nav */}
        <div className="shrink-0 space-y-2 px-1 pt-4">
          <a
            href="mailto:info@construction-runner.com?subject=Construction Runner Support Request"
            className="block text-xs text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline"
          >
            {t("Need help?")}
          </a>
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline px-1"
          >
            {t("Terms of Service")}
          </a>
          <a
            href="/legal/privacy-and-security"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline px-1"
          >
            {t("Privacy & Security Policy")}
          </a>
        </div>
      </aside>
    </>
  );
}
