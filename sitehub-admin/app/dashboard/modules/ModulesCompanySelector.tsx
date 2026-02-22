"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "../components/ui/Button";

const COOKIE_OPTIONS = `path=/; max-age=2592000; SameSite=Lax${typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : ""}`;

export default function ModulesCompanySelector() {
  const router = useRouter();
  const [companies, setCompanies] = useState<{ id: string; name?: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []));
  }, []);

  async function handleSelect() {
    if (!selected.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: selected }),
        credentials: "include",
      });
      try {
        document.cookie = `impersonating=true; ${COOKIE_OPTIONS}`;
        document.cookie = `companyId=${encodeURIComponent(selected)}; ${COOKIE_OPTIONS}`;
      } catch {
        /* document.cookie access denied */
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
        Choose a company to use Messaging, Asset Management, and Offline Working.
      </p>
      <div className="flex gap-2 flex-wrap">
        <select
          className="input flex-1 min-w-[200px]"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">— Select company —</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>
        <Button
          onClick={handleSelect}
          disabled={loading || !selected.trim()}
        >
          {loading ? "Loading…" : "Use this company"}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        You can also use the company switcher in the top bar.
      </p>
    </div>
  );
}
