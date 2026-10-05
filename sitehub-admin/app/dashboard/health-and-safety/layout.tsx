"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNearMissCount } from "../components/NearMissCountProvider";
import { useClientSession } from "../components/ClientSessionProvider";
import { canRoleViewNearMiss } from "@/lib/auth/nearMissRoles";

const subTabs = [
  { name: "RAMS", href: "/dashboard/health-and-safety/rams", showNearMissCount: false },
  { name: "Briefings", href: "/dashboard/health-and-safety/briefings", showNearMissCount: false },
  { name: "Induction safety", href: "/dashboard/health-and-safety/induction-safety", showNearMissCount: false },
  { name: "Site Rules", href: "/dashboard/health-and-safety/site-rules", showNearMissCount: false },
  { name: "COSHH", href: "/dashboard/health-and-safety/coshh", showNearMissCount: false },
  { name: "Alerts", href: "/dashboard/health-and-safety/alerts", showNearMissCount: false },
  { name: "Near Miss", href: "/dashboard/health-and-safety/near-miss", showNearMissCount: true },
];

export default function HealthAndSafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const nearMissCount = useNearMissCount();
  const canViewNearMiss = canRoleViewNearMiss(useClientSession().role);
  const tabs = canViewNearMiss ? subTabs : subTabs.filter((tab) => tab.href !== "/dashboard/health-and-safety/near-miss");

  return (
    <div className="space-y-6">
      <div className="admin-tabs">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const badge = tab.showNearMissCount && nearMissCount > 0 ? nearMissCount : null;
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
