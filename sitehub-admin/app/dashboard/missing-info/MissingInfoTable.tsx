"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Download, HeartPulse, UserRound } from "lucide-react";
import { CardSelect } from "../components/ui/CardSelect";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";

type Row = {
  userId: string;
  name: string;
  email: string;
  role: string | null;
  companyId: string | null;
  missingEmergencyContact: boolean;
  missingMedicalInfo: boolean;
};

export default function MissingInfoTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "emergency" | "medical" | "both">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/missing-info", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Row[];
      setRows(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (q && !(r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q))) return false;
    if (filter === "emergency" && !r.missingEmergencyContact) return false;
    if (filter === "medical" && !r.missingMedicalInfo) return false;
    if (filter === "both" && !(r.missingEmergencyContact && r.missingMedicalInfo)) return false;
    return true;
  });

  return (
    <Table
      title="Missing info"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} worker${rows.length === 1 ? "" : "s"}`
      }
      actions={
        <a href="/api/admin/missing-info?format=csv" className="table-link inline-flex items-center gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </a>
      }
      extra={
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="table-toolbar-input w-64"
          />
          <CardSelect
            items={[
              { id: "emergency", name: "Missing emergency contact only" },
              { id: "medical", name: "Missing medical info only" },
              { id: "both", name: "Missing both" },
            ]}
            value={filter}
            onChange={(id) => setFilter(id as typeof filter)}
            icon={HeartPulse}
            fieldLabel="Filter"
            variant="compact"
            allowNone
            noneValue="all"
            noneLabel="All missing info"
            className="w-64"
          />
        </div>
      }
      columns={[
        {
          header: "Worker",
          accessor: "name",
          render: (r: Row) => <TableNameCell icon={UserRound} label={r.name || "—"} detail={r.email} />,
        },
        { header: "Role", accessor: "role", render: (r: Row) => r.role ?? "—" },
        {
          header: "Missing",
          accessor: "missing",
          render: (r: Row) => (
            <div className="flex flex-wrap gap-1.5">
              {r.missingEmergencyContact && <span className="status-chip status-chip--warn">Emergency contact</span>}
              {r.missingMedicalInfo && <span className="status-chip status-chip--danger">Medical info</span>}
            </div>
          ),
        },
        {
          header: "Actions",
          accessor: "actions",
          render: (r: Row) => (
            <Link href={`/dashboard/users/${r.userId}/my-info`} className="table-link">
              Fill in
            </Link>
          ),
        },
      ]}
      data={loading ? [] : filtered}
      emptyMessage={
        loading
          ? "Loading…"
          : rows.length === 0
            ? "Everyone in your company has their emergency contact and medical info filled in. Nothing to chase."
            : "No workers match the current filter."
      }
    />
  );
}
