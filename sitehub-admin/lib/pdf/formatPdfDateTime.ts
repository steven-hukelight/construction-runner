/** Server-safe datetime for PDF exports (en-GB, 24h). */
export function formatPdfDateTime(date: Date | string | number | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "object" && date !== null && "getTime" in date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const dateStr = d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dateStr} ${timeStr}`;
}
