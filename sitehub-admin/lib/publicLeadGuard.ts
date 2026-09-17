/** Best-effort caps for public marketing forms. In-memory only (per instance). */

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const memoryStore = new Map<string, { count: number; resetAt: number }>();

export const LEAD_INBOX =
  (process.env.DEMO_RECIPIENT_EMAIL ?? "info@construction-runner.com").trim() ||
  "info@construction-runner.com";

export function clipLeadField(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export function publicLeadHoneypotTripped(body: Record<string, unknown>): boolean {
  return String(body.website ?? body.url_website ?? "").trim() !== "";
}

export function checkPublicLeadRateLimit(
  req: Request
): { ok: true } | { ok: false; retryAfter: number } {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown").slice(
    0,
    100
  );
  const now = Date.now();
  const key = `lead:${ip}`;
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}
