export const DOCUMENT_REMIND_CAP = 50;
export const DOCUMENT_REMIND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function unsignedUserIds(assigned: string[], acknowledged: Iterable<string>): string[] {
  const signed = new Set([...acknowledged].map((id) => String(id).trim()).filter(Boolean));
  return [...new Set(assigned.map((id) => String(id).trim()).filter(Boolean))].filter((id) => !signed.has(id));
}

export function splitByInduction(
  unsigned: string[],
  inducted: Set<string>
): { eligible: string[]; skippedInduction: string[] } {
  const eligible: string[] = [];
  const skippedInduction: string[] = [];
  for (const id of unsigned) {
    if (inducted.has(id)) eligible.push(id);
    else skippedInduction.push(id);
  }
  return { eligible, skippedInduction };
}

export function applyRemindCooldown(
  userIds: string[],
  lastRemindedAt: Record<string, string>,
  now = new Date(),
  cooldownMs = DOCUMENT_REMIND_COOLDOWN_MS
): { sendable: string[]; skippedRecent: string[] } {
  const sendable: string[] = [];
  const skippedRecent: string[] = [];
  const cutoff = now.getTime() - cooldownMs;
  for (const id of userIds) {
    const raw = lastRemindedAt[id];
    const t = raw ? new Date(raw).getTime() : NaN;
    if (Number.isFinite(t) && t > cutoff) skippedRecent.push(id);
    else sendable.push(id);
  }
  return { sendable, skippedRecent };
}

export function capRecipients(
  userIds: string[],
  cap = DOCUMENT_REMIND_CAP
): { take: string[]; skippedCap: number } {
  if (userIds.length <= cap) return { take: userIds, skippedCap: 0 };
  return { take: userIds.slice(0, cap), skippedCap: userIds.length - cap };
}
