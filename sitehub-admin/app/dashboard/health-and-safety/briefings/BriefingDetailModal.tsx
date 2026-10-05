"use client";
import toast from "react-hot-toast";

import { useCallback, useEffect, useState } from "react";
import { X, FileDown, Users } from "lucide-react";
import Button from "../../components/ui/Button";
import { PortalOverlay } from "../../components/PortalOverlay";
import { openDocumentUrl } from "@/lib/openDocumentUrl";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";

type Briefing = {
  id: string;
  title?: string;
  body?: string;
  fileUrl?: string;
  file_url?: string;
  siteId?: string | null;
  site_id?: string | null;
};

type AckRow = {
  userId: string;
  name: string;
  role: string;
  acknowledgedAt: string | null;
  hasSignature: boolean;
  signatureUrl?: string | null;
};

export default function BriefingDetailModal({
  briefing,
  companyId,
  canViewAcknowledgements,
  onClose,
}: {
  briefing: Briefing | null;
  companyId: string | null;
  canViewAcknowledgements: boolean;
  onClose: () => void;
}) {
  const [acks, setAcks] = useState<AckRow[]>([]);
  const [meta, setMeta] = useState<{ siteName: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fileUrl = briefing?.fileUrl ?? briefing?.file_url;

  const loadAcks = useCallback(async () => {
    if (!briefing?.id || !companyId || !canViewAcknowledgements) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/briefings/${encodeURIComponent(briefing.id)}/acknowledgements?companyId=${encodeURIComponent(companyId)}`,
        { credentials: "include", cache: "no-store" }
      );
      if (res.status === 403) {
        setError("You don’t have permission to view acknowledgements.");
        setAcks([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load");
      const json = (await res.json()) as {
        acknowledgements?: AckRow[];
        briefing?: { siteName?: string | null };
      };
      setAcks(Array.isArray(json.acknowledgements) ? json.acknowledgements : []);
      setMeta({ siteName: json.briefing?.siteName ?? null });
    } catch {
      setError("Could not load acknowledgements.");
      setAcks([]);
    } finally {
      setLoading(false);
    }
  }, [briefing?.id, companyId, canViewAcknowledgements]);

  useEffect(() => {
    void loadAcks();
  }, [loadAcks]);

  async function exportCsv() {
    if (!briefing?.id || !companyId) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/briefings/report?companyId=${encodeURIComponent(companyId)}&briefingId=${encodeURIComponent(briefing.id)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `briefing-acknowledgements-${briefing.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  }

  async function exportPdf() {
    if (!briefing?.id || !companyId) return;
    setExporting(true);
    try {
      const res = await fetch(
        `/api/briefings/report/pdf?companyId=${encodeURIComponent(companyId)}&briefingId=${encodeURIComponent(briefing.id)}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `briefing-acknowledgements-${briefing.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error("Failed to export PDF.");
    } finally {
      setExporting(false);
    }
  }

  if (!briefing) return null;

  return (
    <PortalOverlay>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative z-10 flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 py-4 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {briefing.title || "Untitled Briefing"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {briefing.body && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{briefing.body}</p>
          </div>
        )}

        {fileUrl && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Document</h4>
            <Button variant="secondary" size="sm" onClick={() => openDocumentUrl(fileUrl)}>
              View PDF
            </Button>
          </div>
        )}

        {!briefing.body && !fileUrl && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">No description or document.</p>
        )}

        {canViewAcknowledgements && companyId && (
          <div className="border-t border-slate-200 dark:border-slate-600 pt-6 pb-2">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Acknowledgements
                {!loading && (
                  <span className="font-normal text-slate-500 dark:text-slate-400">({acks.length})</span>
                )}
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={exporting || loading}
                  onClick={() => void exportPdf()}
                >
                  {exporting ? (
                    "Exporting…"
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 inline mr-1.5 align-text-bottom" />
                      Export PDF
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  disabled={exporting || loading}
                  onClick={() => void exportCsv()}
                >
                  {exporting ? (
                    "Exporting…"
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 inline mr-1.5 align-text-bottom" />
                      Export CSV
                    </>
                  )}
                </Button>
              </div>
            </div>
            {meta?.siteName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Site: {meta.siteName}</p>
            )}
            {error && <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">{error}</p>}
            {loading && <p className="text-sm text-slate-500">Loading…</p>}
            {!loading && !error && acks.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No acknowledgements yet.</p>
            )}
            {!loading && acks.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-600">
                <table className="w-full min-w-[36rem] text-sm">
                  <thead>
                    <tr className="border-b border-blue-100/70 bg-[#eef4fa] text-left text-[12px] font-semibold uppercase tracking-[0.04em] text-slate-500 dark:border-slate-600 dark:bg-slate-900/90 dark:text-slate-400">
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Acknowledged</th>
                      <th className="px-4 py-3">Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acks.map((r) => (
                      <tr
                        key={r.userId}
                        className="border-b border-slate-100/90 text-slate-800 last:border-b-0 dark:border-slate-700/80 dark:text-slate-200"
                      >
                        <td className="max-w-[10rem] truncate px-4 py-3 font-semibold" title={r.name}>
                          {r.name}
                        </td>
                        <td className="max-w-[14rem] truncate px-4 py-3" title={r.role}>
                          {r.role}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {r.acknowledgedAt ? formatDateTime(r.acknowledgedAt) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {r.hasSignature ? (
                            r.signatureUrl ? (
                              <button
                                type="button"
                                className="status-chip status-chip--ok"
                                onClick={() => openDocumentUrl(r.signatureUrl!)}
                                title="View signature"
                              >
                                Yes
                              </button>
                            ) : (
                              <span className="status-chip status-chip--ok">Yes</span>
                            )
                          ) : (
                            <span className="status-chip status-chip--muted">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              PDF includes your company logo (from Settings → Company) and acknowledgement list. CSV opens in Excel or Numbers.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
    </PortalOverlay>
  );
}
