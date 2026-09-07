/**
 * OneSignal REST API – send push notifications to users by external_id.
 * Requires ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY in env.
 */

const ONESIGNAL_URL = "https://api.onesignal.com/notifications";
const FALLBACK_ONESIGNAL_APP_ID = "c50b1f72-8ef7-4458-be1b-c9c6af27a9da";

type OneSignalInvalidAliases = {
  external_id?: string[];
  onesignal_id?: string[];
};

/**
 * OneSignal can return HTTP 200 with either:
 * - `errors: string[]` when nothing is sent (`id` empty)
 * - `errors: object` **when something was routed** — per-recipient skips (invalid alias, unsubscribed, etc.).
 */
type OneSignalNotifResponse = {
  id?: string;
  errors?: string[] | (OneSignalInvalidAliases & Record<string, unknown>) | Record<string, unknown>;
  warnings?: string[];
};

function stringifyData(data: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = typeof v === "string" ? v : String(v);
  }
  return out;
}

function normalizeForCompare(id: string): string {
  const s = String(id).trim();
  return /^[0-9a-f-]{36}$/i.test(s) ? s.toLowerCase() : s;
}

/** OneSignal external_id should match `public.users.id`; UUIDs are case-insensitive but mobile/web must agree on one form. */
function normalizeExternalUserIds(userIds: string[]): string[] {
  const set = new Set<string>();
  for (const id of userIds) {
    const s = String(id).trim();
    if (!s) continue;
    set.add(normalizeForCompare(s));
  }
  return [...set];
}

function parseJson(raw: string): OneSignalNotifResponse | null {
  try {
    return raw ? (JSON.parse(raw) as OneSignalNotifResponse) : {};
  } catch {
    return null;
  }
}

/** True when invalid_aliases.external_id covers every targeted id (= no reachable subscription for anyone in this audience). */
function allTargetsUnresolved(
  errorsObj: Record<string, unknown> | undefined,
  targetNormalized: Set<string>
): boolean {
  if (!errorsObj?.invalid_aliases || typeof errorsObj.invalid_aliases !== "object") return false;
  const inv = errorsObj.invalid_aliases as OneSignalInvalidAliases;
  const list = Array.isArray(inv.external_id) ? inv.external_id : [];
  if (list.length === 0) return false;
  const badSet = new Set(list.map((x) => normalizeForCompare(String(x))));
  return [...targetNormalized].every((tid) => badSet.has(tid));
}

/** Collect human-readable snippet from array-style API errors */
function stringifyArrayErrors(errors: unknown): string | undefined {
  if (!Array.isArray(errors) || errors.length === 0) return undefined;
  const first = errors[0];
  if (typeof first === "string") return first;
  if (typeof first === "object" && first !== null) {
    const vals = Object.values(first as Record<string, string>).filter(Boolean);
    if (vals[0]) return String(vals[0]);
  }
  return JSON.stringify(errors).slice(0, 280);
}

/**
 * HTTP 200 can mean `id: ""` + `errors: [...]` — not delivered.
 * HTTP 200 can also mean `id` present but invalid_aliases lists every recipient (no reachable push subscriptions).
 */
function interpretResponse(
  res: Response,
  raw: string,
  json: OneSignalNotifResponse | null,
  targetNormalized: Set<string>
): { delivered: boolean; error?: string; onesignalId?: string; warning?: string } {
  if (!json) {
    return { delivered: false, error: "Invalid JSON from OneSignal" };
  }
  const hasId = Boolean(json.id && String(json.id).trim());
  const errs = json.errors;
  const apiErrStr =
    stringifyArrayErrors(errs) ??
    (!Array.isArray(errs) && errs && typeof errs === "object" ? JSON.stringify(errs).slice(0, 400) : undefined);

  if (!res.ok) {
    return {
      delivered: false,
      error: apiErrStr ?? raw.slice(0, 300),
    };
  }

  if (!hasId && Array.isArray(errs)) {
    return { delivered: false, error: apiErrStr ?? "No message id (nothing sent)" };
  }
  if (!hasId) {
    return {
      delivered: false,
      error: apiErrStr ?? "No message id",
    };
  }

  if (Array.isArray(errs) && errs.length > 0) {
    return { delivered: false, error: apiErrStr };
  }

  const errObj =
    errs && typeof errs === "object" && !Array.isArray(errs) ? (errs as Record<string, unknown>) : undefined;
  if (allTargetsUnresolved(errObj, targetNormalized)) {
    const inv = (
      ((errObj?.invalid_aliases ?? {}) as { external_id?: string[] }).external_id ?? []
    ).slice(0, 8);
    return {
      delivered: false,
      error:
        `No reachable push subscriptions for these external ids (often OneSignal.login not called on device / permission denied / wrong app id): ${[
          ...targetNormalized,
        ].join(", ")}`,
      warning: inv.length > 0 ? `invalid_aliases.external_id sample: ${JSON.stringify(inv)}` : undefined,
    };
  }

  if (
    errObj &&
    errObj.invalid_aliases &&
    typeof errObj.invalid_aliases === "object" &&
    typeof (errObj.invalid_aliases as { external_id?: unknown }).external_id !== "undefined"
  ) {
    return {
      delivered: true,
      onesignalId: String(json.id),
      warning: `partial_or_skipped (${apiErrStr?.slice(0, 200) ?? "invalid_aliases reported"})`,
    };
  }

  return { delivered: true, onesignalId: String(json.id) };
}

/**
 * Sends transactional push notifications by `external_user_id`.
 * Tries legacy `include_external_user_ids`, then `include_aliases` + `target_channel: push`,
 * plus high priority for reliable delivery while the device is inactive.
 */
export async function sendPushToUsers(
  userIds: string[],
  title: string,
  message: string,
  data?: Record<string, string>
): Promise<{ sent: boolean; error?: string; onesignalId?: string }> {
  const appId = process.env.ONESIGNAL_APP_ID || FALLBACK_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !apiKey || userIds.length === 0) {
    return { sent: false, error: "OneSignal not configured (missing app id, API key, or no user ids)" };
  }
  const cleanIds = normalizeExternalUserIds(userIds);
  if (cleanIds.length === 0) {
    return { sent: false, error: "No valid user ids to target" };
  }

  const payloadBase: Record<string, unknown> = {
    headings: { en: title },
    contents: { en: message },
    subtitle: { en: "Construction Runner" },
    /** Alert-style push (not data-only / background silent). */
    ios_interruption_level: "active",
    /** High priority improves delivery while the app is backgrounded / closed (FCM/APNs). */
    priority: 10,
    /** Seconds before drop; keep within provider limits (~72h typical). */
    ttl: 172800,
  };
  if (data && Object.keys(data).length > 0) {
    payloadBase.data = stringifyData(data);
  }

  async function send(body: Record<string, unknown>) {
    return fetch(ONESIGNAL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  }

  try {
    /*
     * Prefer legacy `include_external_user_ids` first: OneSignal has recommended it for
     * reliably targeting installs registered via mobile SDK player/subscription linkage.
     * Then retry with `include_aliases` + target_channel for the unified user model.
     */
    let res = await send({
      app_id: appId,
      include_external_user_ids: cleanIds,
      ...payloadBase,
    });
    let raw = await res.text();
    let json = parseJson(raw);
    const targets = new Set(cleanIds);
    let out = interpretResponse(res, raw, json, targets);
    if (out.delivered) {
      if (out.warning) console.warn("[OneSignal] legacy:", out.warning);
      if (json && Array.isArray(json.warnings) && json.warnings.length > 0) {
        console.warn("OneSignal warnings (legacy targeting):", json.warnings);
      }
      return { sent: true, onesignalId: out.onesignalId };
    }

    if (!res.ok) {
      console.error("OneSignal error (legacy):", res.status, out.error, raw.slice(0, 500));
    }

    const aliasesBody = {
      app_id: appId,
      include_aliases: { external_id: cleanIds },
      target_channel: "push" as const,
      ...payloadBase,
    };
    res = await send(aliasesBody);
    raw = await res.text();
    json = parseJson(raw);
    out = interpretResponse(res, raw, json, targets);
    if (out.delivered) {
      if (out.warning) console.warn("[OneSignal] aliases:", out.warning);
      if (json && Array.isArray(json.warnings) && json.warnings.length > 0) {
        console.warn("OneSignal warnings (alias targeting):", json.warnings);
      }
      return { sent: true, onesignalId: out.onesignalId };
    }

    if (!res.ok) {
      console.error("OneSignal error (aliases):", res.status, out.error, raw.slice(0, 500));
      return { sent: false, error: out.error };
    }

    console.error(
      "OneSignal (legacy + aliases): no delivery:",
      out.error,
      "| raw:",
      raw.slice(0, 800)
    );
    return { sent: false, error: out.error };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("OneSignal send error:", msg);
    return { sent: false, error: msg };
  }
}
