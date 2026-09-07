"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

export default function BriefingsDownloadReportButton() {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    const companyId = getCompanyIdFromClient();
    if (!companyId) {
      alert("Please select a company first.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/briefings/report?companyId=${encodeURIComponent(companyId)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `briefings-report-${companyId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download report failed:", e);
      alert("Failed to download report. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      ) : (
        <FileDown className="h-4 w-4" />
      )}
      Download report
    </button>
  );
}
