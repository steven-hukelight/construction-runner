"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/ui/Button";
import { CompanyPicker } from "../components/ui/SitePicker";

export default function ModulesCompanySelector() {
  const router = useRouter();
  const [companies, setCompanies] = useState<{ id: string; name?: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []));
  }, []);

  async function handleSelect() {
    if (!selected.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: selected }),
        credentials: "include",
      });
      if (!res.ok) {
        setError("Could not switch company.");
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!companies.length) return null;

  return (
    <div className="card max-w-md">
      <h2 className="text-lg font-semibold mb-2">Select a company</h2>
      <p className="text-sm text-gray-600 mb-4">
        Choose a company to use Messaging and Asset Management.
      </p>
      <div className="flex gap-2 flex-wrap items-end">
        <div className="flex-1 min-w-[200px]">
          <CompanyPicker
            companies={companies}
            value={selected}
            onChange={setSelected}
            placeholder="— Select company —"
          />
        </div>
        <Button
          onClick={handleSelect}
          disabled={loading || !selected.trim()}
        >
          {loading ? "Loading…" : "Use this company"}
        </Button>
      </div>
      {error ? <p className="text-sm text-red-500 mt-2">{error}</p> : null}
      <p className="text-xs text-gray-500 mt-4">
        You can also use the company switcher in the top bar.
      </p>
    </div>
  );
}
