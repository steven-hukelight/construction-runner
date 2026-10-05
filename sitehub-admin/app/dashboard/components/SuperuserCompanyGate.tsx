"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import PageHeader from "./PageHeader";
import Button from "./ui/Button";
import { CompanyPicker } from "./ui/SitePicker";

export default function SuperuserCompanyGate({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const pathname = usePathname();
  const [companies, setCompanies] = useState<{ id: string; name?: string | null }[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/companies", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
  }, []);

  async function openCompany() {
    if (!selected.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ company_id: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data?.error === "string" ? data.error : "Could not open company.");
        return;
      }
      window.location.href = pathname || "/dashboard";
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <div className="card max-w-md space-y-4">
        <p className="text-sm text-gray-600 dark:text-slate-400">
          Select a company to open this page with full access.
        </p>
        <CompanyPicker
          companies={companies}
          value={selected}
          onChange={setSelected}
          placeholder="Select company"
        />
        <Button onClick={openCompany} disabled={loading || !selected.trim()}>
          {loading ? "Opening…" : "Open company"}
        </Button>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
