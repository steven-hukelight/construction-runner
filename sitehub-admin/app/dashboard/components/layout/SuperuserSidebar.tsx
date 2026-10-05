"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  Wrench,
  Menu,
  X,
  LayoutGrid,
  MapPin,
  ClipboardCheck,
} from "lucide-react";
import { preInductionUiEnabled } from "@/lib/featureFlags";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

/* OPTION A: Single sidebar — Modules removed; use CompanySwitcher then regular Sidebar for Messaging and Assets */
const navItems = [
  { name: "Superuser Dashboard", href: "/dashboard/superuser-dashboard", icon: LayoutDashboard },
  { name: "Multi-company Admin", href: "/dashboard/superuser-admin", icon: LayoutGrid },
  { name: "Companies", href: "/dashboard/companies", icon: Building2 },
  { name: "Sites", href: "/dashboard/sites", icon: MapPin },
  // Induction Compliance is primarily a pre-induction dashboard. When pre-induction
  // UI is disabled it is replaced by the slim Missing Info report.
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
  { name: "All Users", href: "/dashboard/all-users", icon: Users },
  { name: "System Logs", href: "/dashboard/system-logs", icon: FileText },
  { name: "Global Settings", href: "/dashboard/global-settings", icon: Settings },
  { name: "Superuser Tools", href: "/dashboard/superuser-tools", icon: Wrench },
];

export default function SuperuserSidebar() {
  const { t } = useDisplayPreferences();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="mobile-menu-btn fixed top-5 left-5 z-50 p-2.5 rounded-lg bg-slate-800 text-white"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileMenuOpen && (
        <div
          className="mobile-menu-btn fixed inset-0 bg-black/40 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`sidebar flex flex-col ${mobileMenuOpen ? "mobile-menu-open" : ""}`}
        style={mobileMenuOpen ? { transform: "translateX(0)" } : {}}
      >
        <div className="shrink-0">
          <div className="logo flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <Image src="/icon.png?v=3" alt="Construction Runner logo" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" unoptimized />
            <span>Construction<br />Runner</span>
          </div>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto pr-2">
          {navItems.map((item) => {
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

        <div className="shrink-0 pt-4 space-y-2 px-1">
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("Superuser panel")}</p>
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
