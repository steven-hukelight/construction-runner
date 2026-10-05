"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FileDown } from "lucide-react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import Button from "../../../components/ui/Button";
import { DataTableShell } from "../../../components/ui/TableChrome";
import { updateRAMSStatus } from "../../../rams/actions";

interface RAMS {
  id: string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  version?: string | null;
  url?: string | null;
  fileUrl?: string | null;
  siteId?: string | null;
  siteName?: string | null;
  /** Present on GET /api/rams/[id] for superuser without cookie company */
  companyId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

type AckRow = {
  userId: string;
  name: string;
  role: string;
  acknowledgedAt: string | null;
  hasSignature: boolean;
};

export default function RAMSDetailClient({
  ramsId,
  companyId,
  canViewAcknowledgements,
}: {
  ramsId: string;
  companyId: string | null;
  canViewAcknowledgements: boolean;
}) {
  const [rams, setRams] = useState<RAMS | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acks, setAcks] = useState<AckRow[]>([]);
  const [acksLoading, setAcksLoading] = useState(false);
  const [acksError, setAcksError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rams/${encodeURIComponent(ramsId)}`, {
        credentials: "include",
      });
      if (res.status === 404) {
        setRams(null);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body?.error === "string" ? body.error : "Could not load RAMS");
        setRams(null);
        return;
      }
      const data = await res.json();
      setRams(data);
    } catch {
      setError("Could not load RAMS");
      setRams(null);
    } finally {
      setLoading(false);
    }
  }, [ramsId]);

  useEffect(() => {
    load();
  }, [load]);

  const effectiveCompanyId = companyId ?? rams?.companyId ?? null;

  const loadAcks = useCallback(async () => {
    const cid = companyId ?? rams?.companyId;
    if (!cid || !canViewAcknowledgements) return;
    setAcksLoading(true);
    setAcksError(null);
    try {
      const q = new URLSearchParams({ companyId: cid });
      const res = await fetch(`/api/rams/${encodeURIComponent(ramsId)}/acknowledgements?${q}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.status === 403) {
        setAcksError("You don’t have permission to view acknowledgements.");
        setAcks([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as { acknowledgements?: AckRow[] };
      setAcks(Array.isArray(json.acknowledgements) ? json.acknowledgements : []);
    } catch {
      setAcksError("Could not load acknowledgements.");
      setAcks([]);
    } finally {
      setAcksLoading(false);
    }
  }, [ramsId, companyId, rams?.companyId, canViewAcknowledgements]);

  useEffect(() => {
    void loadAcks();
  }, [loadAcks]);

  async function exportRamsPdf() {
    const cid = companyId ?? rams?.companyId;
    if (!cid) return;
    setExporting(true);
    try {
      const q = new URLSearchParams({
        companyId: cid,
        ramsId,
      });
      const res = await fetch(`/api/rams/report/pdf?${q}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rams-acknowledgements-${ramsId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  }

  async function handleApprove() {
    await updateRAMSStatus(ramsId, "APPROVED");
    setRams((r) => (r ? { ...r, status: "APPROVED" } : null));
  }

  async function handleReject() {
    await updateRAMSStatus(ramsId, "REJECTED");
    setRams((r) => (r ? { ...r, status: "REJECTED" } : null));
  }

  if (loading && !rams) {
    return <div className="text-slate-500 py-12 text-center">Loading RAMS...</div>;
  }

  if (error && !rams) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600 mb-4">{error}</p>
        <Link href="/dashboard/health-and-safety/rams">
          <Button variant="secondary">Back to RAMS</Button>
        </Link>
      </div>
    );
  }

  if (!rams) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-600 mb-4">RAMS document not found.</p>
        <Link href="/dashboard/health-and-safety/rams">
          <Button variant="secondary">Back to RAMS</Button>
        </Link>
      </div>
    );
  }

  const fileUrl = rams.url ?? rams.fileUrl;
  const displayTitle = (rams.title ?? "").trim() || "Untitled document";

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500 mb-1">
              Document title
            </p>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100 break-words">
              {displayTitle}
            </h2>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm">
                {rams.status || "PENDING"}
              </span>
              {rams.version && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-sm">
                  v{rams.version}
                </span>
              )}
            </div>
          </div>
          <Link href="/dashboard/health-and-safety/rams">
            <Button variant="secondary" size="sm">
              Back
            </Button>
          </Link>
        </div>

        {(rams.description ?? "").trim() ? (
          <div className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 mb-2">Details</p>
            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap text-sm leading-relaxed">
              {rams.description}
            </p>
          </div>
        ) : null}

        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Record</h3>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-slate-500">Site</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {rams.siteName || rams.siteId || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Updated</dt>
            <dd className="text-slate-900 dark:text-slate-100">
              {rams.updatedAt || rams.createdAt
                ? formatDateTime(rams.updatedAt || rams.createdAt!)
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      {fileUrl && (
        <div className="card p-6">
          <h3 className="font-semibold mb-4">PDF</h3>
          <button
            type="button"
            onClick={() => openDocumentUrl(fileUrl)}
            className="inline-flex items-center gap-2 text-blue-600 hover:underline"
          >
            View document
          </button>
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Version history</h3>
        <p className="text-slate-500 text-sm">
          {rams.version ? `Current version: ${rams.version}` : "No version recorded."}
        </p>
      </div>

      <div className="card p-6">
        <h3 className="font-semibold mb-4">Supervisor actions</h3>
        <div className="flex gap-2 flex-wrap">
          {rams.status !== "APPROVED" && <Button onClick={handleApprove}>Approve</Button>}
          {rams.status !== "REJECTED" && (
            <Button variant="secondary" onClick={handleReject}>
              Reject
            </Button>
          )}
        </div>
      </div>

      {canViewAcknowledgements && effectiveCompanyId ? (
        <DataTableShell
          title="Acknowledgements"
          subtitle="Operatives acknowledge RAMS in the mobile app. Per-document signatures are listed here."
          actions={
            <Button
              variant="secondary"
              size="sm"
              type="button"
              disabled={exporting || acksLoading}
              onClick={() => void exportRamsPdf()}
            >
              {exporting ? (
                "Exporting…"
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-1.5 inline align-text-bottom" />
                  Export PDF
                </>
              )}
            </Button>
          }
        >
          {acksError ? <p className="px-5 py-8 text-sm text-amber-700">{acksError}</p> : null}
          {acksLoading ? <p className="px-5 py-8 text-sm text-slate-500">Loading…</p> : null}
          {!acksLoading && !acksError && acks.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">No acknowledgements yet.</p>
          ) : null}
          {!acksLoading && acks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr className="data-table-header border-b border-blue-100/70 bg-[#eef4fa] text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-400">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Acknowledged</th>
                    <th className="px-5 py-3">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {acks.map((r) => (
                    <tr
                      key={r.userId}
                      className="data-table-row border-b border-slate-100/90 text-slate-800 last:border-b-0 hover:bg-blue-50/70 dark:border-slate-700/80 dark:text-slate-200"
                    >
                      <td className="px-5 py-3 font-semibold">{r.name}</td>
                      <td className="px-5 py-3">{r.role}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {r.acknowledgedAt ? formatDateTime(r.acknowledgedAt) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`status-chip ${r.hasSignature ? "status-chip--ok" : "status-chip--muted"}`}>
                          {r.hasSignature ? "Yes" : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p className="px-5 py-3 text-xs text-slate-500">
            PDF includes your company logo from Settings → Company when configured.
          </p>
        </DataTableShell>
      ) : (
        <DataTableShell title="Acknowledgements" subtitle="Operatives can acknowledge RAMS via the mobile app.">
          <p className="px-5 py-8 text-sm text-slate-500">Signatures appear here once recorded.</p>
        </DataTableShell>
      )}
    </div>
  );
}
