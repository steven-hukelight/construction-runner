import type { SummaryWindow } from "./schedule";

export type AttendanceEventKind = "check_in" | "check_out" | "auto_sign_out";

export function formatClock(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
}

export function formatDuration(ms: number): string | null {
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function alertNotificationType(event: AttendanceEventKind): string {
  return event === "auto_sign_out" ? "attendance_auto_sign_out_alert" : `attendance_${event}`;
}

export function alertContent(opts: {
  event: AttendanceEventKind;
  operativeName: string;
  siteName: string;
  occurredAt: Date;
  signedInAt: Date | null;
  reason: string | null;
  timeZone: string;
}): { title: string; body: string } {
  const at = formatClock(opts.occurredAt, opts.timeZone);
  const who = opts.operativeName;
  const site = opts.siteName;

  if (opts.event === "check_in") {
    return { title: `${who} checked in`, body: `${site} · ${at}` };
  }

  if (opts.event === "check_out") {
    const duration = opts.signedInAt ? formatDuration(opts.occurredAt.getTime() - opts.signedInAt.getTime()) : null;
    return {
      title: `${who} checked out`,
      body: duration ? `${site} · ${at} · ${duration} on site` : `${site} · ${at}`,
    };
  }

  const title = `${who} was signed out automatically`;
  if (opts.reason === "fallback_max_shift") {
    return { title, body: `${site} · still signed in after 12 hours · ${at}` };
  }
  return { title, body: `Left ${site} · ${at}` };
}

export type SummaryCounts = { checkIns: number; checkOuts: number; autoSignOuts: number };

export function summaryContent(opts: {
  siteName: string;
  counts: SummaryCounts;
  window: SummaryWindow;
  timeZone: string;
}): { title: string; body: string } {
  const { siteName, counts, window } = opts;
  const out = counts.checkOuts + counts.autoSignOuts;
  const when = window.kind === "daily" ? "today" : `since ${formatClock(window.from, opts.timeZone)}`;
  const title = `${siteName}: ${counts.checkIns} in, ${out} out ${when}`;
  const body =
    counts.autoSignOuts > 0
      ? `${counts.autoSignOuts} signed out automatically. Tap to see the list.`
      : "Tap to see the list.";
  return { title, body };
}
