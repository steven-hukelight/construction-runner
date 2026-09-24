/** Preset inspection intervals for site kit (access equipment, power tools, etc.). */
export const ASSET_INSPECTION_INTERVAL_PRESETS = [
  { label: "1 week", days: 7 },
  { label: "1 month", days: 30 },
  { label: "3 months", days: 90 },
  { label: "6 months", days: 182 },
  { label: "1 year", days: 365 },
] as const;

export type AssetInspectionDueStatus = "ok" | "due_soon" | "overdue" | "none";

export function addDaysToDate(base: Date, days: number): Date {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** YYYY-MM-DD in UTC. */
export function toDateOnlyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function computeNextInspectionDue(opts: {
  intervalDays: number | null | undefined;
  from?: Date;
}): string | null {
  const days = opts.intervalDays;
  if (days == null || !Number.isFinite(days) || days <= 0) return null;
  return toDateOnlyUtc(addDaysToDate(opts.from ?? new Date(), Math.floor(days)));
}

export function assetInspectionDueStatus(opts: {
  nextDue: string | null | undefined;
  reminderDaysBefore?: number | null;
  inspectionRequired?: boolean | null;
  today?: Date;
}): AssetInspectionDueStatus {
  if (opts.inspectionRequired === false) return "none";
  const due = (opts.nextDue ?? "").trim();
  if (!due) return "none";
  const today = opts.today ?? new Date();
  const todayStr = toDateOnlyUtc(today);
  if (due < todayStr) return "overdue";
  const remind = Math.max(0, opts.reminderDaysBefore ?? 7);
  const soon = toDateOnlyUtc(addDaysToDate(today, remind));
  if (due <= soon) return "due_soon";
  return "ok";
}

export function parseIntervalDays(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}
