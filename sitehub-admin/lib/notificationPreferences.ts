/**
 * Per-user notification preferences stored in `users.email_notification_preferences` (JSONB).
 * Every preference defaults to on; only an explicit `false` opts out.
 */
export type NotificationPreferences = {
  operativePendingApproval: boolean;
  assetInspectionReminders: boolean;
};

export const NOTIFICATION_PREFERENCE_KEYS = [
  "operativePendingApproval",
  "assetInspectionReminders",
] as const satisfies readonly (keyof NotificationPreferences)[];

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

/** Keys only admins, supervisors and sub-admins may change. */
export const MANAGER_ONLY_PREFERENCE_KEYS: ReadonlySet<NotificationPreferenceKey> = new Set([
  "operativePendingApproval",
]);

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

export function parseNotificationPreferences(raw: unknown): NotificationPreferences {
  const o = asRecord(raw);
  return {
    operativePendingApproval: o.operativePendingApproval !== false,
    assetInspectionReminders: o.assetInspectionReminders !== false,
  };
}

export function assetInspectionRemindersEnabled(raw: unknown): boolean {
  return parseNotificationPreferences(raw).assetInspectionReminders;
}

/**
 * Pick the boolean preference keys present in a PATCH body.
 * Returns an error message when the body has no valid keys or a non-boolean value.
 */
export function pickPreferencePatch(
  body: unknown,
): { patch: Partial<NotificationPreferences> } | { error: string } {
  const o = asRecord(body);
  const patch: Partial<NotificationPreferences> = {};
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (!(key in o)) continue;
    const v = o[key];
    if (typeof v !== "boolean") return { error: `${key} must be a boolean` };
    patch[key] = v;
  }
  if (Object.keys(patch).length === 0) {
    return { error: `Provide at least one of: ${NOTIFICATION_PREFERENCE_KEYS.join(", ")}` };
  }
  return { patch };
}

/** Merge a patch into the stored JSONB without dropping unrelated keys. */
export function mergePreferences(
  stored: unknown,
  patch: Partial<NotificationPreferences>,
): Record<string, unknown> {
  return { ...asRecord(stored), ...patch };
}
