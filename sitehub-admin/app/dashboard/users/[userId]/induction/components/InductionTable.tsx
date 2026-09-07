"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import Table from "@/app/dashboard/components/ui/Table";
import Button from "@/app/dashboard/components/ui/Button";

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
  const styles: Record<InductionRow["status"], { bg: string; text: string }> = {
    completed: { bg: "bg-emerald-100", text: "text-emerald-800" },
    not_started: { bg: "bg-gray-100", text: "text-gray-700" },
    expired: { bg: "bg-amber-100", text: "text-amber-800" },
  };
  const s = styles[status] ?? styles.not_started;
  const labels: Record<InductionRow["status"], string> = {
    completed: "Completed",
    not_started: "Not Started",
    expired: "Expired",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${s.bg} ${s.text}`}>
      {labels[status]}
    </span>
  );
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
        alert(err.error || "Failed to reset induction");
        return;
      }
      onRefresh?.();
      router.refresh();
    } finally {
      setResetting(null);
    }
  }

  const columns = [
    { header: "Site Name", accessor: "siteName" as const, render: (row: InductionRow) => row.siteName },
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Table columns={columns} data={rows} />
    </div>
  );
}
