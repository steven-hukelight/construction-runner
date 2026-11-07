const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 2 * 60 * 1000;

export type OfflineOccurredAtResult =
  | { ok: true; iso: string }
  | { ok: false; error: string };

/**
 * Client time for an offline attendance event.
 * Honour it only when the caller sets offlineRecorded. Reject times more than
 * two minutes ahead or older than 24 hours so a replay cannot rewrite history.
 */
export function resolveOfflineOccurredAt(
  raw: unknown,
  now: Date = new Date(),
): OfflineOccurredAtResult {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { ok: false, error: "occurredAt required for an offline attendance event" };
  }
  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) {
    return { ok: false, error: "occurredAt is not a valid time" };
  }
  if (at.getTime() - now.getTime() > FUTURE_SKEW_MS) {
    return { ok: false, error: "occurredAt is in the future" };
  }
  if (now.getTime() - at.getTime() > MAX_AGE_MS) {
    return { ok: false, error: "occurredAt is older than 24 hours" };
  }
  return { ok: true, iso: at.toISOString() };
}

/** True when the person's latest attendance record is newer than a replayed offline event. */
export function lastEventIsNewerThan(occurredAtIso: string | null, lastEventTimestamp: string | null | undefined): boolean {
  if (!occurredAtIso || !lastEventTimestamp) return false;
  const last = new Date(lastEventTimestamp).getTime();
  const occurred = new Date(occurredAtIso).getTime();
  return Number.isFinite(last) && Number.isFinite(occurred) && last > occurred;
}

export function isOfflineRecordedBody(body: {
  offlineRecorded?: unknown;
  offline_recorded?: unknown;
}): boolean {
  return body.offlineRecorded === true || body.offline_recorded === true;
}

/** One JSON line on the attendance notes so the office can see it was recorded offline. */
export function appendOfflineRecordedNote(notes: string | null, clientEventId: unknown): string {
  const id = typeof clientEventId === "string" ? clientEventId.trim().slice(0, 80) : "";
  const line = JSON.stringify({
    offline_recorded: true,
    ...(id ? { client_event_id: id } : {}),
  });
  const existing = notes?.trim() ?? "";
  return existing ? `${existing}\n${line}` : line;
}
