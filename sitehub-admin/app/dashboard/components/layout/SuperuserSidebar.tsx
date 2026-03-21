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
} from "lucide-react";

/* OPTION A: Single sidebar — Modules removed; use CompanySwitcher then regular Sidebar for Messaging, Assets, Offline */
const navItems = [
  { name: "Superuser Dashboard", href: "/dashboard/superuser-dashboard", icon: LayoutDashboard },
  { name: "Multi-company Admin", href: "/dashboard/superuser-admin", icon: LayoutGrid },
  { name: "Companies", href: "/dashboard/companies", icon: Building2 },
  { name: "All Users", href: "/dashboard/all-users", icon: Users },
  { name: "System Logs", href: "/dashboard/system-logs", icon: FileText },
  { name: "Global Settings", href: "/dashboard/global-settings", icon: Settings },
  { name: "Superuser Tools", href: "/dashboard/superuser-tools", icon: Wrench },
];

export default function SuperuserSidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="mobile-menu-btn fixed top-5 left-5 z-50 p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 border border-white/20 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {mobileMenuOpen && (
        <div
          className="mobile-menu-btn fixed inset-0 bg-gradient-to-br from-gray-900/80 via-blue-900/70 to-blue-800/80 backdrop-blur-sm z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`sidebar flex flex-col ${mobileMenuOpen ? "mobile-menu-open" : ""}`}
        style={mobileMenuOpen ? { transform: "translateX(0)" } : {}}
      >
        <div className="shrink-0">
          <div className="logo flex items-center gap-3 mb-8 pb-6 border-b border-gray-200/50">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg">
              <Image src="/icon.png" alt="Construction Runner logo" width={24} height={24} />
            </div>
            <span>Construction Runner Superuser</span>
          </div>
          <div className="px-3 mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Superuser</p>
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
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 pt-4 space-y-2">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-slate-800 dark:to-slate-700 border border-blue-100 dark:border-slate-600">
            <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">Superuser panel</p>
            <p className="text-xs text-gray-600 dark:text-slate-400">Tenant & system management</p>
          </div>
          <a
            href="/legal/privacy-and-security"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline px-1"
          >
            Privacy & Security Policy
          </a>
        </div>
      </aside>
    </>
  );
}
