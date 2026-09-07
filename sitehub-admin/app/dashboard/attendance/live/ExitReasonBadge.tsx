"use client";

import type { ExitReasonKind } from "./attendanceSessionTypes";

const styles: Record<ExitReasonKind, string> = {
  auto: "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/25",
  manual: "bg-slate-500/10 text-slate-600 dark:text-slate-400 ring-1 ring-slate-500/15",
  server_check: "bg-amber-500/15 text-amber-800 dark:text-amber-200 ring-1 ring-amber-500/30",
};

const labels: Record<ExitReasonKind, string> = {
  auto: "Auto",
  manual: "Manual",
  server_check: "Server check",
};

export default function ExitReasonBadge({ kind }: { kind: ExitReasonKind | null }) {
  if (!kind) {
    return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  }
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${styles[kind]}`}
    >
      {labels[kind]}
    </span>
  );
}
