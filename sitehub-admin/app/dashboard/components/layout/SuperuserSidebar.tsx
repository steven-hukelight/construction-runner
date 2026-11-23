"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

const navItems = [
  { name: "Superuser dashboard", href: "/dashboard/superuser-dashboard", icon: LayoutDashboard },
  { name: "Multi-company admin", href: "/dashboard/superuser-admin", icon: LayoutGrid },
  { name: "Companies", href: "/dashboard/companies", icon: Building2 },
  { name: "All users", href: "/dashboard/all-users", icon: Users },
  { name: "System logs", href: "/dashboard/system-logs", icon: FileText },
  { name: "Global settings", href: "/dashboard/global-settings", icon: Settings },
  { name: "Superuser tools", href: "/dashboard/superuser-tools", icon: Wrench },
];

export default function SuperuserSidebar() {
  const { t } = useDisplayPreferences();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileMenuOpen]);

  return (
    <>
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

      <aside
        className={`sidebar flex flex-col ${mobileMenuOpen ? "mobile-menu-open" : ""}`}
        style={mobileMenuOpen ? { transform: "translateX(0)" } : {}}
      >
        <div className="shrink-0">
          <div className="logo mb-6 flex items-center gap-3 border-b border-gray-200 pb-4">
            <Image src="/icon.png?v=3" alt="Construction Runner logo" width={48} height={48} className="h-12 w-12 shrink-0 object-contain" unoptimized />
            <span>Construction<br />Runner</span>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto pr-2">
          {navItems.map((item) => {
            const active = pathname === item.href || Boolean(pathname?.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>{t(item.name)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 px-1 pt-4">
          <p className="text-xs text-gray-500 dark:text-slate-400">{t("Superuser panel")}</p>
          <a
            href="mailto:info@construction-runner.com?subject=Construction Runner Support Request"
            className="block px-1 text-xs text-gray-600 hover:text-blue-600 hover:underline dark:text-slate-400 dark:hover:text-blue-400"
          >
            {t("Need help?")}
          </a>
          <a
            href="/legal/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-1 text-xs text-gray-600 hover:text-blue-600 hover:underline dark:text-slate-400 dark:hover:text-blue-400"
          >
            {t("Terms of Service")}
          </a>
          <a
            href="/legal/privacy-and-security"
            target="_blank"
            rel="noopener noreferrer"
            className="block px-1 text-xs text-gray-600 hover:text-blue-600 hover:underline dark:text-slate-400 dark:hover:text-blue-400"
          >
            {t("Privacy & Security Policy")}
          </a>
        </div>
      </aside>
    </>
  );
}
