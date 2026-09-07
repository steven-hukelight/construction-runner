"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Building2, ClipboardCheck } from "lucide-react";

export default function SiteDetailTabBar({ siteId }: { siteId: string }) {
  useEffect(() => {
    if (siteId && typeof document !== "undefined") {
      try {
        document.cookie = `currentSiteId=${siteId}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } catch {
        /* cookie access */
      }
    }
  }, [siteId]);
  const pathname = usePathname();
  const base = `/dashboard/sites/${siteId}`;
  const isDetails = pathname === base;
  const isSubcontractors = pathname === `${base}/subcontractors`;
  const isInduction = pathname === `${base}/induction`;

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl border-b-2 -mb-px transition ${
      active
        ? "border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-400"
        : "border-transparent text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100"
    }`;

  return (
    <div className="flex gap-2 border-b border-gray-200 dark:border-slate-600">
      <Link href={base} className={tabClass(isDetails)}>
        <MapPin size={18} />
        Details
      </Link>
      <Link href={`${base}/subcontractors`} className={tabClass(isSubcontractors)}>
        <Building2 size={18} />
        Subcontractors
      </Link>
      <Link href={`${base}/induction`} className={tabClass(isInduction)}>
        <ClipboardCheck size={18} />
        Induction
      </Link>
    </div>
  );
}
