"use client";

import React, { useState } from "react";
import Button from "@/app/dashboard/components/ui/Button";

type Props = {
  siteId: string | null;
  companyId: string | null;
  status: string | null;
};

export default function ExportCsvButton({ siteId, companyId, status }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch("/api/induction/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, companyId, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `induction-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={loading}
      size="sm"
      className="!rounded-lg"
    >
      {loading ? "Exporting…" : "Export CSV"}
    </Button>
  );
}
