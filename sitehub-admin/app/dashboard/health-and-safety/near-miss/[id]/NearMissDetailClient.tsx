"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Button from "@/app/dashboard/components/ui/Button";
import { FileDown, ArrowLeft, CheckCircle2 } from "lucide-react";

type NearMissItem = {
  id: string;
  description?: string;
  status?: string;
  site_id?: string | null;
  site_name?: string | null;
  operative_id?: string | null;
  reviewed_at?: string | null;
  attachments?: { url?: string; name?: string }[];
  created_at?: string;
};

export default function NearMissDetailClient({ item }: { item: NearMissItem }) {
  const router = useRouter();

  async function handleExportReport() {
    try {
      const res = await fetch(`/api/near-miss/${item.id}/export`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `near-miss-report-${item.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed. Please try again.");
    }
  }

  async function markReviewed() {
    const res = await fetch(`/api/near-miss/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewedAt: new Date().toISOString() }),
      credentials: "include",
    });
    if (res.ok) router.refresh();
  }

  const attachments = Array.isArray(item.attachments) ? item.attachments : [];
  const reviewed = !!item.reviewed_at;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/dashboard/health-and-safety/near-miss"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={18} />
          Back to Near Miss
        </Link>
        <div className="flex gap-2">
          <Button onClick={handleExportReport}>
            <FileDown size={18} className="mr-2" />
            Export Report
          </Button>
          {!reviewed && (
            <Button variant="secondary" onClick={markReviewed}>
              <CheckCircle2 size={18} className="mr-2" />
              Mark as Reviewed
            </Button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Near Miss Report</h1>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Date</dt>
            <dd className="mt-1 text-gray-900">
              {item.created_at ? new Date(item.created_at).toLocaleString("en-GB") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Site</dt>
            <dd className="mt-1 text-gray-900">{item.site_name ?? item.site_id ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                  reviewed ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {reviewed ? "Reviewed" : "Pending"}
              </span>
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-gray-500">Description</dt>
            <dd className="mt-1 text-gray-900 whitespace-pre-wrap">{item.description || "—"}</dd>
          </div>
          {attachments.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 mb-2">Attachments</dt>
              <dd className="space-y-2">
                {attachments.map((att, i) => (
                  <a
                    key={i}
                    href={(att as { url?: string }).url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-blue-600 hover:underline"
                  >
                    {(att as { name?: string }).name || `Attachment ${i + 1}`}
                  </a>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
