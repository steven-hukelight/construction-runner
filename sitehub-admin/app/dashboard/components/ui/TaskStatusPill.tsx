"use client";

/** Map task/delivery/asset statuses onto the shared table status-chip system. */
function chipForStatus(raw: string): string {
  const s = raw.toLowerCase().replace(/\s+/g, "_");
  if (["done", "complete", "completed", "received", "reviewed", "approved", "available", "good"].includes(s)) {
    return "status-chip--ok";
  }
  if (["in_progress", "in-progress", "assigned", "active", "scheduled"].includes(s)) {
    return "status-chip--info";
  }
  if (["open", "pending", "todo", "to_do", "draft", "fair"].includes(s)) {
    return "status-chip--warn";
  }
  if (["rejected", "cancelled", "canceled", "failed", "poor", "overdue"].includes(s)) {
    return "status-chip--danger";
  }
  return "status-chip--muted";
}

export function TaskStatusPill({ status }: { status?: string | null }) {
  const s = (status ?? "").toString().trim() || "—";
  const label = s === "—" ? "—" : s.replace(/_/g, " ");
  const chip = s === "—" ? "status-chip--muted" : chipForStatus(s);
  return <span className={`status-chip ${chip}`}>{label}</span>;
}
