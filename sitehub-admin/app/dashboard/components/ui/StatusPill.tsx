"use client";

type StatusVariant = "reviewed" | "pending" | "approved" | "rejected" | "received" | "default";

const variants: Record<StatusVariant, string> = {
  reviewed: "bg-[var(--status-reviewed,#E6F4EA)] text-[#0d6832] dark:bg-emerald-900/40 dark:text-emerald-300",
  approved: "bg-[var(--status-reviewed,#E6F4EA)] text-[#0d6832] dark:bg-emerald-900/40 dark:text-emerald-300",
  received: "bg-[var(--status-reviewed,#E6F4EA)] text-[#0d6832] dark:bg-emerald-900/40 dark:text-emerald-300",
  pending: "bg-[var(--status-pending,#FFF4E5)] text-[#9a6700] dark:bg-amber-900/40 dark:text-amber-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  default: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
};

type StatusPillProps = {
  status: StatusVariant;
  label?: string;
  className?: string;
};

const defaultLabels: Record<StatusVariant, string> = {
  reviewed: "Reviewed",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  received: "Received",
  default: "—",
};

export function StatusPill({ status, label, className = "" }: StatusPillProps) {
  const variant = variants[status] ?? variants.default;
  const displayLabel = label ?? defaultLabels[status] ?? status;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-[20px] text-[13px] font-medium ${variant} ${className}`}>
      {displayLabel}
    </span>
  );
}

export function statusToVariant(s: string | undefined): StatusVariant {
  if (!s) return "default";
  const lower = s.toLowerCase();
  if (["reviewed", "approved", "received", "complete"].includes(lower)) return "received";
  if (["pending", "scheduled"].includes(lower)) return "pending";
  if (["rejected", "cancelled"].includes(lower)) return "rejected";
  return "default";
}
