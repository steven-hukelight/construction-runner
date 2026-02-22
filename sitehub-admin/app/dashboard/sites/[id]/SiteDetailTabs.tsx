"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import EditSiteForm from "./EditSiteForm";
import SiteSubcontractorsTab from "./SiteSubcontractorsTab";
import { MapPin, Building2, ClipboardCheck } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SiteDetailTabs({ site }: { site: any }) {
  const [tab, setTab] = useState<"details" | "subcontractors">("details");
  const pathname = usePathname();

  useEffect(() => {
    if (site?.id && typeof document !== "undefined") {
      try {
        document.cookie = `currentSiteId=${site.id}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      } catch {
        /* cookie access */
      }
    }
  }, [site?.id]);
  const isInductionPage = pathname === `/dashboard/sites/${site.id}/induction`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("details")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl border-b-2 -mb-px transition ${
            tab === "details"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <MapPin size={18} />
          Details
        </button>
        <button
          type="button"
          onClick={() => setTab("subcontractors")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl border-b-2 -mb-px transition ${
            tab === "subcontractors"
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <Building2 size={18} />
          Subcontractors
        </button>
        <Link
          href={`/dashboard/sites/${site.id}/induction`}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-xl border-b-2 -mb-px transition ${
            isInductionPage
              ? "border-blue-600 text-blue-600 bg-blue-50/50"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          <ClipboardCheck size={18} />
          Induction
        </Link>
      </div>

      {tab === "details" && <EditSiteForm site={site} />}
      {tab === "subcontractors" && <SiteSubcontractorsTab siteId={site.id} />}
    </div>
  );
}
