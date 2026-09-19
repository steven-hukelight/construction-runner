"use client";

import { useState, useEffect, useCallback } from "react";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import { useClientSession } from "../ClientSessionProvider";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Package,
  ListTodo,
  MessageSquare,
  Settings,
  Menu,
  X,
  HardHat,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  ScrollText,
  AlertTriangle,
  AlertCircle,
  List,
  MapPin,
  Users,
  ClipboardCheck,
  ShieldCheck,
  Building2,
  ClipboardList,
  UserCheck,
} from "lucide-react";

import { preInductionUiEnabled } from "@/lib/featureFlags";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

// Admin/Supervisor: Sites, Subcontractors, [Induction Compliance | Missing Info], Users, pending signups, Attendance
const adminNavItems = [
  { name: "Sites", href: "/dashboard/sites", icon: MapPin },
  { name: "Subcontractors", href: "/dashboard/subcontractors", icon: Building2 },
  // When the pre-induction UI is disabled, "Induction Compliance" is replaced by
  // the slim "Missing Info" report (emergency contact + medical info completeness).
  ...(preInductionUiEnabled
    ? [
        {
          name: "Induction Compliance",
          href: "/dashboard/induction-compliance",
          icon: ClipboardCheck,
        },
      ]
    : [
        {
          name: "Missing Info",
          href: "/dashboard/missing-info",
          icon: ClipboardCheck,
        },
      ]),
  { name: "Users", href: "/dashboard/users", icon: Users },
  { name: "Pending approvals", href: "/dashboard/pending-approvals", icon: UserCheck },
  { name: "Attendance", href: "/dashboard/attendance", icon: ClipboardList },
];

type SidebarProps = {
  role?: string | null;
};

// Task 7: New sidebar structure — Modules removed; Safety replaces H&S sub-tabs
const topLevelItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Deliveries", href: "/dashboard/deliveries", icon: Package },
  { name: "Assets", href: "/dashboard/assets", icon: Package },
  { name: "Messages", href: "/dashboard/messaging", icon: MessageSquare },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const safetySubItems = [
  { name: "RAMS", href: "/dashboard/health-and-safety/rams", icon: FileText },
  { name: "Briefings", href: "/dashboard/health-and-safety/briefings", icon: MessageSquare },
  { name: "Induction safety", href: "/dashboard/health-and-safety/induction-safety", icon: ShieldCheck },
  { name: "COSHH", href: "/dashboard/health-and-safety/coshh", icon: FlaskConical },
  { name: "Site Rules", href: "/dashboard/health-and-safety/site-rules", icon: ScrollText },
  { name: "Alerts", href: "/dashboard/health-and-safety/alerts", icon: AlertTriangle },
  { name: "Near Miss", href: "/dashboard/health-and-safety/near-miss", icon: AlertCircle },
  { name: "Logs", href: "/dashboard/system-logs", icon: List },
];

const subAdminNavItem = { name: "Operative Onboarding", href: "/dashboard/subcontractor", icon: FileText };

export default function Sidebar({ role }: SidebarProps) {
  const { t } = useDisplayPreferences();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { impersonating } = useClientSession();
  const [nearMissBadge, setNearMissBadge] = useState(0);
  const [pendingApprovalsBadge, setPendingApprovalsBadge] = useState(0);
  const [safetyExpanded, setSafetyExpanded] = useState(
    () => pathname?.startsWith("/dashboard/health-and-safety") || pathname === "/dashboard/system-logs"
  );

  const fetchNearMissBadge = useCallback(() => {
    const r = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!r || r === "operative") return;
    const qs = `/api/near-miss${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}${companyId ? "&" : "?"}count=unreviewed`;
    fetch(qs, { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((d) => setNearMissBadge(typeof d?.count === "number" ? d.count : 0))
      .catch(() => {});
  }, []);

  const fetchPendingApprovalsBadge = useCallback(() => {
    const r = (getRoleFromClient() ?? "").toLowerCase();
    if (!r || r === "operative") return;
    if (!["admin", "supervisor", "sub_admin", "superuser", "site_admin"].includes(r)) return;
    fetch("/api/auth/registrations", { cache: "no-store", credentials: "include" })
      .then((res) => res.json())
      .then((d) => setPendingApprovalsBadge(Array.isArray(d) ? d.length : 0))
      .catch(() => setPendingApprovalsBadge(0));
  }, []);

  useEffect(() => {
    fetchNearMissBadge();
    fetchPendingApprovalsBadge();
  }, [pathname, fetchNearMissBadge, fetchPendingApprovalsBadge]);

  useEffect(() => {
    window.addEventListener("near-miss-reviewed", fetchNearMissBadge);
    window.addEventListener("pending-approvals-changed", fetchPendingApprovalsBadge);
    return () => {
      window.removeEventListener("near-miss-reviewed", fetchNearMissBadge);
      window.removeEventListener("pending-approvals-changed", fetchPendingApprovalsBadge);
    };
  }, [fetchNearMissBadge, fetchPendingApprovalsBadge]);

  return (
    <>
      {/* Mobile Menu Button - only visible on mobile */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="mobile-menu-btn fixed top-5 left-5 z-50 p-2.5 rounded-lg bg-slate-800 text-white"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="mobile-menu-btn fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}

      <aside 
        className={`sidebar flex flex-col ${
          mobileMenuOpen ? 'mobile-menu-open' : ''
        }`}
        style={mobileMenuOpen ? { transform: 'translateX(0)' } : {}}
      >
        {/* Top: logo + back button + label — no scroll */}
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
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 text-amber-800 font-semibold border border-amber-200 hover:bg-amber-100 transition-all text-sm"
                title="Stop impersonating and return to Superuser"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" className="shrink-0"><path d="M15 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back to Superuser
              </button>
            </div>
          )}

          {/* Navigation label */}
          <div className="px-3 mb-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-[0.12em]">Main menu</p>
          </div>
        </div>

        {/* Nav: fills remaining space and scrolls so tabs are never behind help */}
        <nav className="sidebar-nav flex-1 min-h-0 overflow-y-auto pr-2">
          <Link
            href="/dashboard"
            className={
              pathname === "/dashboard" || pathname === "/dashboard/admin-dashboard" ? "active" : ""
            }
            onClick={() => setMobileMenuOpen(false)}
          >
            <LayoutDashboard size={20} strokeWidth={2.5} />
            <span>{t("Dashboard")}</span>
          </Link>
          {(role === "superuser" || role === "SUPERUSER") && (
            <Link
              href="/dashboard/pending-approvals"
              className={
                pathname === "/dashboard/pending-approvals" || pathname?.startsWith("/dashboard/pending-approvals/")
                  ? "active"
                  : ""
              }
              onClick={() => setMobileMenuOpen(false)}
            >
              <UserCheck size={20} strokeWidth={2.5} />
              <span className="flex-1 min-w-0">{t("Pending approvals")}</span>
              {pendingApprovalsBadge > 0 && (
                <span
                  className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
                  aria-label={`${pendingApprovalsBadge} pending approvals`}
                >
                  {pendingApprovalsBadge > 99 ? "99+" : pendingApprovalsBadge}
                </span>
              )}
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
          {["admin", "ADMIN", "site_admin", "supervisor", "SUPERVISOR", "sub_admin"].includes(role ?? "") &&
            adminNavItems.map((item) => {
              const active =
                pathname === item.href ||
                pathname?.startsWith(item.href + "/") ||
                (item.href === "/dashboard/users" && pathname?.startsWith("/dashboard/operatives"));
              const Icon = item.icon;
              const showPendingBadge =
                item.href === "/dashboard/pending-approvals" && pendingApprovalsBadge > 0;
              return (
                <Link
                  key={item.href}
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
                  <span>{t("Induction Compliance")}</span>
                </Link>
              ) : (
                <Link href="/dashboard/missing-info" className={pathname === "/dashboard/missing-info" ? "active" : ""} onClick={() => setMobileMenuOpen(false)}>
                  <ClipboardCheck size={20} strokeWidth={2.5} />
                  <span>{t("Missing Info")}</span>
                </Link>
              )}
            </>
          ) : null}
          {topLevelItems.slice(1, 5).map((item) => {
            const active = pathname === item.href;
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
          {/* Safety expandable section */}
          <div className="sidebar-safety-section">
            <button
              type="button"
              onClick={() => setSafetyExpanded(!safetyExpanded)}
              className={`sidebar-link flex items-center justify-between w-full ${pathname?.startsWith("/dashboard/health-and-safety") || pathname === "/dashboard/system-logs" ? "active" : ""}`}
            >
              <span className="flex items-center gap-3">
                <HardHat size={20} strokeWidth={2.5} />
                {t("Safety")}
              </span>
              {nearMissBadge > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center">
                  {nearMissBadge > 99 ? "99+" : nearMissBadge}
                </span>
              )}
              {safetyExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            {safetyExpanded && (
              <div className="pl-8 flex flex-col gap-0.5 mt-1">
                {safetySubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isActive = pathname === sub.href || pathname.startsWith(sub.href + "/");
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`text-sm py-2 px-3 rounded-lg flex items-center gap-2 ${isActive ? "bg-blue-100 text-blue-800 font-medium" : "text-gray-600 hover:bg-blue-50/80 hover:text-gray-900"}`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <SubIcon size={16} strokeWidth={2} />
                      {t(sub.name)}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
          {topLevelItems.slice(5, 7).map((item) => {
            const active = pathname === item.href;
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
        <div className="shrink-0 pt-4 space-y-2 px-1">
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
