export const INDUCTION_EXPIRY_DAYS = 365;

const EXPIRY_MS = INDUCTION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export function isValidCompletedSiteInduction(row: {
  status?: string | null;
  completed_at?: string | Date | null;
}): boolean {
  const status = String(row.status ?? "").toLowerCase().trim();
  if (status !== "completed") return false;
  if (row.completed_at == null || row.completed_at === "") return false;
  const t =
    row.completed_at instanceof Date
      ? row.completed_at.getTime()
      : new Date(row.completed_at).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= EXPIRY_MS;
}
