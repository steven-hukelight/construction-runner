"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";

const subTabs = [
  { name: "RAMS", href: "/dashboard/health-and-safety/rams", countKey: "rams" as const },
  { name: "Briefings", href: "/dashboard/health-and-safety/briefings", countKey: "briefings" as const },
  { name: "Induction safety", href: "/dashboard/health-and-safety/induction-safety", countKey: null },
  { name: "Site Rules", href: "/dashboard/health-and-safety/site-rules", countKey: null },
  { name: "COSHH", href: "/dashboard/health-and-safety/coshh", countKey: null },
  { name: "Alerts", href: "/dashboard/health-and-safety/alerts", countKey: "alerts" as const },
  { name: "Near Miss", href: "/dashboard/health-and-safety/near-miss", countKey: "nearMiss" as const },
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
      <div className="admin-tabs">
        {subTabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const badge = tab.countKey === "nearMiss" && (counts.nearMiss ?? 0) > 0 ? counts.nearMiss : null;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={isActive ? "active" : ""}
              aria-current={isActive ? "page" : undefined}
            >
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
