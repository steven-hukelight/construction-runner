"use client";
import toast from "react-hot-toast";

import React, { useState } from "react";
import { toSentenceCase } from "@/lib/utils/sentenceCase";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import Table from "@/app/dashboard/components/ui/Table";
import { TableNameCell } from "@/app/dashboard/components/ui/TableChrome";
import Button from "@/app/dashboard/components/ui/Button";
import { MapPin } from "lucide-react";

export type InductionRow = {
  siteId: string;
  siteName: string;
  status: "completed" | "not_started" | "expired";
  completedAt: string | null;
};

function formatCompletedAt(completedAt: string | null): string {
  if (!completedAt) return "—";
  const d = new Date(completedAt);
  if (isNaN(d.getTime())) return "—";
  return formatDateTime(d);
}

function StatusBadge({ status }: { status: InductionRow["status"] }) {
  const labels: Record<InductionRow["status"], string> = {
    completed: "Completed",
    not_started: "Not Started",
    expired: "Expired",
  };
  const chip =
    status === "completed" ? "status-chip--ok" : status === "expired" ? "status-chip--danger" : "status-chip--muted";
  return <span className={`status-chip ${chip}`}>{toSentenceCase(labels[status])}</span>;
}

export default function InductionTable({
  userId,
  rows,
  onRefresh,
}: {
  userId: string;
  rows: InductionRow[];
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const [resetting, setResetting] = useState<string | null>(null);

  async function handleReset(siteId: string) {
    if (!confirm("Reset induction for this site? The user will need to complete it again.")) return;
    setResetting(siteId);
    try {
      const res = await fetch("/api/induction/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, siteId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to reset induction");
        return;
      }
      onRefresh?.();
      router.refresh();
    } finally {
      setResetting(null);
    }
  }

  const columns = [
    { header: "Site Name", accessor: "siteName" as const, render: (row: InductionRow) => <TableNameCell icon={MapPin} label={row.siteName} /> },
    {
      header: "Status",
      accessor: "status" as const,
      render: (row: InductionRow) => <StatusBadge status={row.status} />,
    },
    {
      header: "Completed At",
      accessor: "completedAt" as const,
      render: (row: InductionRow) => formatCompletedAt(row.completedAt),
    },
    {
      header: "Reset",
      accessor: "reset" as const,
      render: (row: InductionRow) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={resetting === row.siteId}
          onClick={() => handleReset(row.siteId)}
          className="!rounded-lg"
        >
          {resetting === row.siteId ? "Resetting…" : "Reset"}
        </Button>
      ),
    },
  ];

  return (
    <Table
      title="Site inductions"
      subtitle={`${rows.length} site${rows.length === 1 ? "" : "s"}`}
      columns={columns}
      data={rows}
      emptyMessage="No induction records yet."
    />
  );
}
