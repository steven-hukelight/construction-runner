/**
 * Ensure values are JSON-serializable before passing Server Component props to Client Components.
 * Handles Date, BigInt, cycles, and shared references (second visit → null to avoid infinite recursion).
 *
 * Production RSC failures often show only a generic "digest" if non-serializable values cross the boundary.
 */

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const t = typeof value;
  if (t === "bigint") return value.toString();
  if (t === "string" || t === "number" || t === "boolean") return value;
  if (t === "function" || t === "symbol") return undefined;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    if (seen.has(value)) return null;
    seen.add(value);
    return value.map((item) => sanitizeValue(item, seen));
  }

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    if (seen.has(obj)) return null;
    seen.add(obj);

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const v = obj[key];
      if (typeof v === "function" || typeof v === "symbol") continue;
      out[key] = sanitizeValue(v, seen);
    }
    return out;
  }

  return null;
}

export function deepSerializeForClient<T>(value: T): T {
  if (value === undefined) return value;

  try {
    const sanitized = sanitizeValue(value, new WeakSet<object>());
    return JSON.parse(JSON.stringify(sanitized)) as T;
  } catch (e) {
    console.error("deepSerializeForClient:", e);
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      if (Array.isArray(value)) return [] as T;
      if (value !== null && typeof value === "object") return {} as T;
      return value;
    }
  }
}
