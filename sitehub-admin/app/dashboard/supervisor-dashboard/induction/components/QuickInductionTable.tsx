"use client";
import toast from "react-hot-toast";

import React, { useState } from "react";
import { toSentenceCase } from "@/lib/utils/sentenceCase";
import { useRouter } from "next/navigation";
import Table from "@/app/dashboard/components/ui/Table";
import { TableNameCell } from "@/app/dashboard/components/ui/TableChrome";
import Button from "@/app/dashboard/components/ui/Button";
import type { QuickInductionOperative } from "../server";
import { UserRound } from "lucide-react";

function formatCompletedAt(completedAt: Date | null): string {
  if (!completedAt) return "—";
  const d = completedAt instanceof Date ? completedAt : new Date(completedAt);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

// Neutral status labels — the "Pre-Induction Required" / "Pre-Induction Override"
// legacy labels are mapped to plain "Induction Required" / "Override Applied" so
// pre-induction language never leaks to supervisors after the My Info reflow.
const STATUS_CHIP: Record<string, string> = {
  Inducted: "status-chip--ok",
  Grandfathered: "status-chip--info",
  "Induction Required": "status-chip--warn",
  "Override Applied": "status-chip--info",
  Expired: "status-chip--danger",
};

function displayStatus(status: string): string {
  if (status === "Pre-Induction Required") return "Induction Required";
  if (status === "Pre-Induction Override") return "Override Applied";
  return status;
}

function StatusBadge({ status }: { status: string }) {
  const label = displayStatus(status);
  const chip = STATUS_CHIP[label] ?? "status-chip--muted";
  return <span className={`status-chip ${chip}`}>{toSentenceCase(label)}</span>;
}

export default function QuickInductionTable({
  siteId,
  rows,
}: {
  siteId: string;
  rows: QuickInductionOperative[];
}) {
  const router = useRouter();
  const [resetting, setResetting] = useState<string | null>(null);

  async function handleReset(userId: string) {
    if (!confirm("Reset induction for this operative? They will need to complete it again.")) return;
    setResetting(userId);
    try {
      const res = await fetch("/api/induction/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, siteId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to reset induction");
        return;
      }
      router.refresh();
    } finally {
      setResetting(null);
    }
  }

  const columns = [
    {
      header: "Operative Name",
      accessor: "operativeName" as const,
      render: (row: QuickInductionOperative) => (
        <TableNameCell icon={UserRound} label={row.operativeName} />
      ),
    },
    {
      header: "Company Name",
      accessor: "companyName" as const,
      render: (row: QuickInductionOperative) => row.companyName,
    },
    {
      header: "Status",
      accessor: "status" as const,
      render: (row: QuickInductionOperative) => <StatusBadge status={row.status} />,
    },
    {
      header: "Completed At",
      accessor: "completedAt" as const,
      render: (row: QuickInductionOperative) => formatCompletedAt(row.completedAt),
    },
    {
      header: "Reset",
      accessor: "reset" as const,
      render: (row: QuickInductionOperative) => (
        <Button
          size="sm"
          variant="secondary"
          disabled={resetting === row.operativeId}
          onClick={() => handleReset(row.operativeId)}
          className="!rounded-lg"
        >
          {resetting === row.operativeId ? "Resetting…" : "Reset"}
        </Button>
      ),
    },
  ];

  return (
    <Table
      title="Site induction"
      subtitle={`${rows.length} operative${rows.length === 1 ? "" : "s"}`}
      columns={columns}
      data={rows}
      emptyMessage="No operatives assigned to this site."
    />
  );
}
