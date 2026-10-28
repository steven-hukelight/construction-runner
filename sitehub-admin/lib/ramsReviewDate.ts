/** Parse a form/API date into YYYY-MM-DD or null (clears the field). */
export function parseReviewDateInput(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const day = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  return day;
}

export function isReviewOverdue(
  reviewDate: string | null | undefined,
  today = new Date()
): boolean {
  if (!reviewDate) return false;
  const day = String(reviewDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
  return day < todayStr;
}

/** Noon local-safe ISO so YYYY-MM-DD DATE values do not shift a day in formatDate. */
export function reviewDateForDisplay(reviewDate: string | null | undefined): string | null {
  if (!reviewDate) return null;
  const day = String(reviewDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return `${day}T12:00:00`;
}
