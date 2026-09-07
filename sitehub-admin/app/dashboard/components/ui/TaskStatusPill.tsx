"use client";

/** Yellow=open/pending, Orange=in progress, Green=done/complete */
const YELLOW = "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
const ORANGE = "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300";
const GREEN = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
const DEFAULT = "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";

const STATUS_STYLES: Record<string, string> = {
  OPEN: YELLOW,
  open: YELLOW,
  PENDING: YELLOW,
  pending: YELLOW,
  IN_PROGRESS: ORANGE,
  "IN PROGRESS": ORANGE,
  in_progress: ORANGE,
  DONE: GREEN,
  done: GREEN,
  COMPLETE: GREEN,
  complete: GREEN,
  completed: GREEN,
  RECEIVED: GREEN,
  received: GREEN,
  reviewed: GREEN,
  APPROVED: GREEN,
  approved: GREEN,
};

export function TaskStatusPill({ status }: { status?: string | null }) {
  const s = (status ?? "").toString().trim() || "—";
  const style = STATUS_STYLES[s] ?? STATUS_STYLES[s.toLowerCase()] ?? DEFAULT;
  const label = s === "—" ? "—" : s.replace(/_/g, " ");
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}
