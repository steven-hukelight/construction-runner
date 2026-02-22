"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import { X } from "lucide-react";

const COOKIE_OPTIONS = `path=/; max-age=2592000; SameSite=Lax${typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : ""}`;

function clearCompanyCookies() {
  try {
    document.cookie = "companyId=; path=/; max-age=0";
    document.cookie = "impersonating=; path=/; max-age=0";
  } catch {
    /* document.cookie access denied */
  }
}

export default function CompanySwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [companies, setCompanies] = useState<{ id: string; name?: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (getRoleFromClient()?.toLowerCase() !== "superuser") return;
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []));
  }, []);

  useEffect(() => {
    setSelected(getCompanyIdFromClient());
  }, [pathname]);

  const isSuperuser = getRoleFromClient()?.toLowerCase() === "superuser";
  const impersonating = Boolean(isSuperuser && selected);

  if (!isSuperuser) return null;

  function navigate() {
    // Stay on current page (e.g. /dashboard/modules) instead of redirecting to /dashboard
    router.refresh();
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setSelected(val || null);

    if (!val) {
      clearCompanyCookies();
      navigate();
      return;
    }

    try {
      const res = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: val }),
        credentials: "include",
      });
      if (res.ok && val) {
        try {
          document.cookie = `impersonating=true; ${COOKIE_OPTIONS}`;
          document.cookie = `companyId=${encodeURIComponent(val)}; ${COOKIE_OPTIONS}`;
        } catch {
          /* document.cookie access denied */
        }
      } else if (val) {
        try {
          document.cookie = `impersonating=true; ${COOKIE_OPTIONS}`;
          document.cookie = `companyId=${encodeURIComponent(val)}; ${COOKIE_OPTIONS}`;
        } catch {
          /* document.cookie access denied */
        }
      }
      navigate();
    } catch {
      if (val) {
        try {
          document.cookie = `impersonating=true; ${COOKIE_OPTIONS}`;
          document.cookie = `companyId=${encodeURIComponent(val)}; ${COOKIE_OPTIONS}`;
        } catch {
          /* document.cookie access denied */
        }
      }
      navigate();
    }
  }

  function handleClear() {
    clearCompanyCookies();
    setSelected(null);
    navigate();
  }

  if (!companies.length) return null;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-xl border-2 transition-all ${
        impersonating
          ? "border-amber-400 bg-amber-50/80 shadow-md shadow-amber-200/40"
          : "border-blue-200 bg-gradient-to-r from-white via-blue-50 to-white"
      }`}
      style={impersonating ? { boxShadow: "0 2px 12px 0 rgba(251,191,36,0.2)" } : { boxShadow: "0 2px 12px 0 rgba(59,130,246,0.07)" }}
    >
      <div className="relative flex-1 min-w-[140px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </span>
        <select
          className={`appearance-none w-full pl-11 pr-8 py-2.5 bg-transparent text-base font-semibold cursor-pointer outline-none focus:ring-0 ${
            impersonating ? "text-amber-900" : "text-blue-900"
          }`}
          value={selected || ""}
          onChange={handleChange}
          title={impersonating ? "Impersonating — switch or clear" : "Switch company"}
        >
          <option value="" className="text-gray-500 font-medium">
            — No company —
          </option>
          {companies.map((c) => (
            <option key={c.id} value={c.id} className="text-blue-900 font-medium bg-white hover:bg-blue-50">
              {c.name || c.id}
            </option>
          ))}
        </select>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </span>
      </div>
      {impersonating && (
        <button
          type="button"
          onClick={handleClear}
          className="p-2 rounded-lg text-amber-700 hover:bg-amber-200/60 hover:text-amber-900 transition-colors"
          title="Exit company view"
          aria-label="Clear company"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
