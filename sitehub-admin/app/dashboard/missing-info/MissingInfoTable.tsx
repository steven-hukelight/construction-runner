"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Bell, Download, HeartPulse, UserRound } from "lucide-react";
import { CardSelect } from "../components/ui/CardSelect";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import RoleBadge from "../components/RoleBadge";
import Button from "../components/ui/Button";

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
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const [remindingAll, setRemindingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/missing-info", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Row[];
      setRows(Array.isArray(data) ? data : []);
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

  async function remindOne(userId: string) {
    if (remindingId || remindingAll) return;
    setRemindingId(userId);
    try {
      const res = await fetch("/api/admin/missing-info/remind", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Remind failed");
      if (json.pushSent) {
        toast.success("Reminder sent");
      } else {
        toast.success(
          json.emailed
            ? "Email reminder sent (push may be unavailable on their device)"
            : "Reminder attempted, check they have the app installed and notifications on",
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remind failed");
    } finally {
      setRemindingId(null);
    }
  }

  async function remindAllVisible() {
    if (remindingAll || remindingId || filtered.length === 0) return;
    if (
      !confirm(
        `Send a reminder to ${filtered.length} worker${filtered.length === 1 ? "" : "s"} to complete their profile info?`,
      )
    ) {
      return;
    }
    setRemindingAll(true);
    try {
      const res = await fetch("/api/admin/missing-info/remind", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: filtered.map((r) => r.userId) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Remind failed");
      toast.success(
        `Reminded ${json.recipients ?? filtered.length} worker${(json.recipients ?? filtered.length) === 1 ? "" : "s"}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remind failed");
    } finally {
      setRemindingAll(false);
    }
  }

  return (
    <Table
      title="Missing info"
      subtitle={
        loading
          ? "Loading…"
          : `${filtered.length} of ${rows.length} worker${rows.length === 1 ? "" : "s"}`
      }
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="secondary"
            type="button"
            disabled={loading || remindingAll || filtered.length === 0}
            onClick={() => void remindAllVisible()}
          >
            <Bell className="h-4 w-4 mr-1.5 inline" />
            {remindingAll ? "Sending…" : "Remind all"}
          </Button>
          <a href="/api/admin/missing-info?format=csv" className="table-link inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </a>
        </div>
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
        {
          header: "Role",
          accessor: "role",
          render: (r: Row) => <RoleBadge role={r.role} />,
        },
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
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="table-link"
                disabled={remindingId === r.userId || remindingAll}
                onClick={() => void remindOne(r.userId)}
              >
                {remindingId === r.userId ? "Sending…" : "Remind"}
              </button>
              <Link href={`/dashboard/users/${r.userId}/my-info`} className="table-link">
                Fill in
              </Link>
            </div>
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
