"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Table from "@/app/dashboard/components/ui/Table";
import Button from "@/app/dashboard/components/ui/Button";
import type { SiteInductionOperative } from "../server";
import { preInductionUiEnabled } from "@/lib/featureFlags";

// When the pre-induction UI is disabled site-wide, present pre-induction
// specific statuses under neutral labels so users don't see the feature name.
const STATUS_DISPLAY_LABEL: Record<string, string> = preInductionUiEnabled
  ? {}
  : {
      "Pre-Induction Required": "Induction Required",
      "Pre-Induction Override": "Override Applied",
    };

function formatCompletedAt(completedAt: string | null): string {
  if (!completedAt) return "—";
  const d = new Date(completedAt);
  if (isNaN(d.getTime())) return "—";
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
  const label = STATUS_DISPLAY_LABEL[status] ?? status;
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${s.bg} ${s.text}`}>
      {label}
    </span>
  );
}

const CAN_MARK_INDUCTED = ["Induction Required", "Pre-Induction Required", "Pre-Induction Override"];

export default function SiteInductionTable({
  siteId,
  rows,
  myCompanyId,
  onRemoveOperative,
  onMarkInducted,
}: {
  siteId: string;
  rows: SiteInductionOperative[];
  myCompanyId?: string | null;
  onRemoveOperative?: (operativeId: string) => void;
  onMarkInducted?: (operativeId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [resetting, setResetting] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function handleMarkInducted(operativeId: string) {
    if (onMarkInducted) {
      setMarkingId(operativeId);
      try {
        await onMarkInducted(operativeId);
        router.refresh();
      } finally {
        setMarkingId(null);
      }
      return;
    }
    setMarkingId(operativeId);
    try {
      const res = await fetch("/api/induction/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: operativeId, siteId }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to mark as inducted");
        return;
      }
      router.refresh();
    } finally {
      setMarkingId(null);
    }
  }

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
      header: "Actions",
      accessor: "actions" as const,
      render: (row: SiteInductionOperative) =>
        CAN_MARK_INDUCTED.includes(row.status) ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={markingId === row.operativeId}
            onClick={() => handleMarkInducted(row.operativeId)}
            className="!rounded-lg !text-emerald-700 hover:!text-emerald-800"
          >
            {markingId === row.operativeId ? "Marking…" : "Mark inducted"}
          </Button>
        ) : (
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
    ...(onRemoveOperative && myCompanyId
      ? [
          {
            header: "Remove from site",
            accessor: "remove" as const,
            render: (row: SiteInductionOperative) =>
              row.companyId === myCompanyId ? (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={removingId === row.operativeId}
                  onClick={async () => {
                    if (!confirm("Remove this operative from the site?")) return;
                    setRemovingId(row.operativeId);
                    try {
                      await onRemoveOperative(row.operativeId);
                    } finally {
                      setRemovingId(null);
                    }
                  }}
                  className="!rounded-lg !text-red-600 hover:!text-red-700"
                >
                  {removingId === row.operativeId ? "Removing…" : "Remove"}
                </Button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <Table columns={columns} data={rows} />
    </div>
  );
}
