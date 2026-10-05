"use client";

import { toSentenceCase } from "@/lib/utils/sentenceCase";

type StatusVariant = "reviewed" | "pending" | "approved" | "rejected" | "received" | "default";

const variants: Record<StatusVariant, string> = {
  reviewed: "status-chip--ok",
  approved: "status-chip--ok",
  received: "status-chip--ok",
  pending: "status-chip--warn",
  rejected: "status-chip--danger",
  default: "status-chip--muted",
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
  const displayLabel = toSentenceCase(label ?? defaultLabels[status] ?? status) || "—";
  return (
    <span className={`status-chip ${variant} ${className}`.trim()}>
      {displayLabel}
    </span>
  );
}

export function statusToVariant(s: string | undefined): StatusVariant {
  if (!s) return "default";
  const lower = s.toLowerCase();
  if (["reviewed", "approved", "received", "complete", "completed", "done"].includes(lower)) return "received";
  if (["pending", "scheduled", "open", "todo"].includes(lower)) return "pending";
  if (["rejected", "cancelled", "canceled"].includes(lower)) return "rejected";
  return "default";
}
