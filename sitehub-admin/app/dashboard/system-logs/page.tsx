"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "../components/PageHeader";
import { FileText, RefreshCw, AlertCircle, AlertTriangle, Info, Trash2 } from "lucide-react";
import Button from "../components/ui/Button";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { getRoleFromClient } from "@/lib/utils/cookies";

type LogEntry = {
  id: string;
  time: string;
  level: string;
  message: string;
  source?: string;
};

const POLL_INTERVAL_MS = 10_000;

type FetchLogsResult = { logs: LogEntry[]; error?: string };

async function fetchLogs(): Promise<FetchLogsResult> {
  try {
    const res = await fetch("/api/maintenance/activity-log");
    const data = await res.json();
    if (!res.ok) {
      const err = typeof (data as { error?: string }).error === "string" ? (data as { error: string }).error : "Could not load activity";
      return { logs: [], error: err };
    }
    return { logs: Array.isArray(data) ? data : [] };
  } catch {
    return { logs: [], error: "Network error" };
  }
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [canClearSystemLogs, setCanClearSystemLogs] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setCanClearSystemLogs(getRoleFromClient()?.toLowerCase() === "superuser"));
  }, []);

  const loadLogs = useCallback((showLoading = true) => {
    if (showLoading) setLoading(true);
    return fetchLogs()
      .then(({ logs: next, error }) => {
        setLogs(next);
        setLoadError(error ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    const id = setInterval(() => loadLogs(false), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadLogs]);

  async function handleClearLogs() {
    setClearing(true);
    try {
      const res = await fetch("/api/system-logs/clear", { method: "POST" });
      if (res.ok) {
        setClearConfirmOpen(false);
        await loadLogs();
      }
    } finally {
      setClearing(false);
      setLoading(false);
    }
  }

  return (
    <div className="relative space-y-8">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />

      <PageHeader
        title="System logs"
        description="Audit and system activity. Logging can be extended to capture auth, registrations, and API usage."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => loadLogs()}
              disabled={loading}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {canClearSystemLogs && (
              <Button
                variant="danger"
                onClick={() => setClearConfirmOpen(true)}
                disabled={loading}
                className="inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Logs
              </Button>
            )}
          </div>
        }
      />

      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2 dark:text-slate-100">Clear System Logs</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
              This will delete all rows from the system_logs table. This action cannot be undone. The clear action will be recorded in audit_logs.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setClearConfirmOpen(false)} disabled={clearing}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleClearLogs} disabled={clearing}>
                {clearing ? "Clearing…" : "Clear Logs"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-200/40 dark:border-slate-600">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent activity</h3>
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/30 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-400">System and audit events · auto-refreshes every 10s</p>
          </div>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : loadError ? (
          <div className="py-10 px-4 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">Could not load activity</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">{loadError}</p>
              </div>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 px-4 rounded-xl bg-gray-50/80 dark:bg-slate-700/60 border border-gray-200/60 dark:border-slate-600">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 dark:text-slate-100">No activity log yet</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Company audit events, registrations, and (for platform admins) auth and system messages appear here. Activity refreshes every 10 seconds.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-[480px] overflow-y-auto">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 py-3 px-4 rounded-xl bg-gray-50/60 dark:bg-slate-700/60 border border-gray-200/40 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {entry.level === "error" ? (
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                ) : entry.level === "warn" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-slate-100 leading-snug">{entry.message}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 tabular-nums">
                    {formatDateTime(entry.time)}
                    {entry.source ? ` · ${entry.source}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
