"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useClientSession } from "./ClientSessionProvider";
import { X } from "lucide-react";
import { CompanyPicker } from "./ui/SitePicker";

const HIDE_ON = [
  "/dashboard/all-users",
  "/dashboard/companies",
  "/dashboard/system-logs",
  "/dashboard/global-settings",
  "/dashboard/superuser-tools",
  "/dashboard/superuser-admin",
];

export default function CompanySwitcher() {
  const pathname = usePathname();
  const { role, companyId } = useClientSession();
  const [companies, setCompanies] = useState<{ id: string; name?: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(companyId);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (role?.toLowerCase() !== "superuser") return;
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]))
      .finally(() => setLoaded(true));
  }, [role]);

  const isSuperuser = role?.toLowerCase() === "superuser";
  const impersonating = Boolean(isSuperuser && selected);

  if (!isSuperuser) return null;
  if (HIDE_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;
  if (!loaded) {
    return (
      <div className="min-w-[180px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-400">
        Loading companies…
      </div>
    );
  }

  async function handleChange(val: string) {
    setError("");
    setSelected(val || null);

    if (!val) {
      const res = await fetch("/api/stop-impersonate", { method: "POST", credentials: "include" });
      if (!res.ok) {
        setError("Could not leave company view.");
        return;
      }
      window.location.href = "/dashboard/superuser-dashboard";
      return;
    }

    const res = await fetch("/api/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: val }),
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data?.error === "string" ? data.error : "Could not switch company.");
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleClear() {
    setError("");
    const res = await fetch("/api/stop-impersonate", { method: "POST", credentials: "include" });
    if (!res.ok) {
      setError("Could not leave company view.");
      return;
    }
    setSelected(null);
    window.location.href = "/dashboard/superuser-dashboard";
  }

  if (!companies.length) return null;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg border px-1 ${
        impersonating
          ? "border-amber-300 bg-amber-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="relative flex-1 min-w-[180px]">
        <CompanyPicker
          companies={companies}
          value={selected || ""}
          onChange={handleChange}
          variant="compact"
          allowNone
          noneLabel="Platform (all companies)"
          noneValue=""
          fieldLabel="Company"
          placeholder="Switch company"
        />
      </div>
      {impersonating && (
        <button
          type="button"
          onClick={handleClear}
          className="p-2 rounded-lg text-amber-700 hover:bg-amber-200/60 hover:text-amber-900 transition-colors"
          title="Back to Superuser"
          aria-label="Back to Superuser"
        >
          <X className="w-5 h-5" />
        </button>
      )}
      {error ? <span className="text-xs text-red-600 pr-2">{error}</span> : null}
    </div>
  );
}
