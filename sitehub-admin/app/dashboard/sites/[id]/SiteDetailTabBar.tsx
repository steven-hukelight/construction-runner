"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const isSafety = pathname === `${base}/safety`;

  return (
    <div className="flex gap-0 admin-tabs">
      <Link href={base} className={isDetails ? "active" : ""} aria-current={isDetails ? "page" : undefined}>
        Details
      </Link>
      <Link href={`${base}/subcontractors`} className={isSubcontractors ? "active" : ""} aria-current={isSubcontractors ? "page" : undefined}>
        Subcontractors
      </Link>
      <Link href={`${base}/induction`} className={isInduction ? "active" : ""} aria-current={isInduction ? "page" : undefined}>
        Induction
      </Link>
      <Link href={`${base}/safety`} className={isSafety ? "active" : ""} aria-current={isSafety ? "page" : undefined}>
        Safety info
      </Link>
    </div>
  );
}
