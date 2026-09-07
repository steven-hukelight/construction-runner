"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import Button from "@/app/dashboard/components/ui/Button";
import { FileDown, ArrowLeft, CheckCircle2, ExternalLink, Trash2 } from "lucide-react";

type NearMissItem = {
  id: string;
  description?: string;
  status?: string;
  site_id?: string | null;
  site_name?: string | null;
  operative_id?: string | null;
  reviewed_at?: string | null;
  attachments?: Array<{ url?: string; path?: string; name?: string; downloadUrl?: string; fileUrl?: string } | string>;
  created_at?: string;
};

export default function NearMissDetailClient({
  item,
}: {
  item: NearMissItem;
  attachmentsWithSignedUrls?: { url?: string; name?: string; signedUrl?: string | null }[];
}) {
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
      cache: "no-store",
    });
    if (res.ok) {
      window.dispatchEvent(new Event("near-miss-reviewed"));
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this near miss report? This cannot be undone.")) return;
    const res = await fetch(`/api/near-miss/${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) router.push("/dashboard/health-and-safety/near-miss");
    else alert("Delete failed. Please try again.");
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
        <div className="flex flex-wrap gap-2">
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
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={18} className="mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="card p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Near Miss Report</h1>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Date</dt>
            <dd className="mt-1 text-gray-900">
              {item.created_at ? formatDateTime(item.created_at) : "—"}
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
                {attachments.map((att, i) => {
                  const raw =
                    typeof att === "string"
                      ? att.trim()
                      : (
                          (att as { url?: string }).url ??
                          (att as { path?: string }).path ??
                          (att as { downloadUrl?: string }).downloadUrl ??
                          (att as { fileUrl?: string }).fileUrl ??
                          ""
                        ).trim();
                  const name =
                    typeof att === "object" && att && "name" in att
                      ? String((att as { name?: string }).name || "").trim()
                      : "";
                  const label = name || `Attachment ${i + 1}`;
                  if (!raw) return null;
                  const openUrl = `/api/near-miss/open-attachment?url=${encodeURIComponent(raw)}&reportId=${encodeURIComponent(item.id)}`;
                  return (
                    <a
                      key={i}
                      href={openUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <ExternalLink size={14} />
                      {label}
                    </a>
                  );
                })}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
