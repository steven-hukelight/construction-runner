"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Table from "@/app/dashboard/components/ui/Table";
import Button from "@/app/dashboard/components/ui/Button";
import type { SiteInductionOperative } from "../server";

function formatCompletedAt(completedAt: Date | null): string {
  if (!completedAt) return "—";
  const d = completedAt instanceof Date ? completedAt : new Date(completedAt);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Inducted: { bg: "bg-emerald-100", text: "text-emerald-800" },
  Grandfathered: { bg: "bg-blue-100", text: "text-blue-800" },
  "Pre-Induction Required": { bg: "bg-amber-100", text: "text-amber-800" },
  "Pre-Induction Override": { bg: "bg-purple-100", text: "text-purple-800" },
  "Induction Required": { bg: "bg-gray-100", text: "text-gray-700" },
  Expired: { bg: "bg-red-100", text: "text-red-800" },
};

function StatusBadge({ status }: { status: SiteInductionOperative["status"] }) {
  const s = STATUS_STYLES[status] ?? { bg: "bg-gray-100", text: "text-gray-700" };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${s.bg} ${s.text}`}>
      {status}
    </span>
  );
}

export default function SiteInductionTable({
  siteId,
  rows,
}: {
  siteId: string;
  rows: SiteInductionOperative[];
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
        alert(err.error ?? "Failed to reset induction");
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
      render: (row: SiteInductionOperative) => row.operativeName,
    },
    {
      header: "Company Name",
      accessor: "companyName" as const,
      render: (row: SiteInductionOperative) => row.companyName,
    },
    {
      header: "Status",
      accessor: "status" as const,
      render: (row: SiteInductionOperative) => <StatusBadge status={row.status} />,
    },
    {
      header: "Completed At",
      accessor: "completedAt" as const,
      render: (row: SiteInductionOperative) => formatCompletedAt(row.completedAt),
    },
    {
      header: "Reset",
      accessor: "reset" as const,
      render: (row: SiteInductionOperative) => (
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
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Table columns={columns} data={rows} density="comfortable" />
    </div>
  );
}
