"use client";

import { useEffect, useState } from "react";
import { useClientSession } from "./ClientSessionProvider";
import { X } from "lucide-react";
import { CompanyPicker } from "./ui/SitePicker";

export default function CompanySwitcher() {
  const { role, companyId } = useClientSession();
  const [companies, setCompanies] = useState<{ id: string; name?: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(companyId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (role?.toLowerCase() !== "superuser") return;
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []));
  }, [role]);

  const isSuperuser = role?.toLowerCase() === "superuser";
  const impersonating = Boolean(isSuperuser && selected);

  if (!isSuperuser) return null;

  function navigate() {
    const url = new URL(window.location.href);
    url.searchParams.set("_t", String(Date.now()));
    window.location.href = url.toString();
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
      navigate();
      return;
    }

    const res = await fetch("/api/impersonate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: val }),
      credentials: "include",
    });
    if (!res.ok) {
      setError("Could not switch company.");
      return;
    }
    navigate();
  }

  async function handleClear() {
    setError("");
    const res = await fetch("/api/stop-impersonate", { method: "POST", credentials: "include" });
    if (!res.ok) {
      setError("Could not leave company view.");
      return;
    }
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
      <div className="relative flex-1 min-w-[180px]">
        <CompanyPicker
          companies={companies}
          value={selected || ""}
          onChange={handleChange}
          variant="compact"
          allowNone
          noneLabel="— No company —"
          noneValue=""
          fieldLabel={impersonating ? "Impersonating" : "Company"}
          placeholder="Switch company"
        />
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
      {error ? <span className="text-xs text-red-600 pr-2">{error}</span> : null}
    </div>
  );
}
