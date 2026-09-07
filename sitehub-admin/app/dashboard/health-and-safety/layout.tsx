"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, MessageSquare, ScrollText, FlaskConical, AlertTriangle, AlertCircle } from "lucide-react";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";

const subTabs = [
  { name: "RAMS", href: "/dashboard/health-and-safety/rams", icon: FileText, countKey: "rams" as const },
  { name: "Briefings", href: "/dashboard/health-and-safety/briefings", icon: MessageSquare, countKey: "briefings" as const },
  { name: "Site Rules", href: "/dashboard/health-and-safety/site-rules", icon: ScrollText, countKey: null },
  { name: "COSHH", href: "/dashboard/health-and-safety/coshh", icon: FlaskConical, countKey: null },
  { name: "Alerts", href: "/dashboard/health-and-safety/alerts", icon: AlertTriangle, countKey: "alerts" as const },
  { name: "Near Miss", href: "/dashboard/health-and-safety/near-miss", icon: AlertCircle, countKey: "nearMiss" as const },
];

export default function HealthAndSafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ nearMiss?: number }>({});

  useEffect(() => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!role || role === "operative") return;
    const params = new URLSearchParams({ unreviewed: "true" });
    if (companyId) params.set("companyId", companyId);
    fetch(`/api/near-miss?${params}`)
      .then((r) => r.json())
      .then((arr) => setCounts({ nearMiss: Array.isArray(arr) ? arr.length : 0 }))
      .catch(() => {});
  }, [pathname]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const badge = tab.countKey === "nearMiss" && (counts.nearMiss ?? 0) > 0 ? counts.nearMiss : null;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-600"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {tab.name}
              {badge != null && (
                <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full text-xs font-medium bg-amber-500 text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
