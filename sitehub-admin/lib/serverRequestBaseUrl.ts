import { headers } from "next/headers";
import { getBaseUrl } from "@/lib/url";

/**
 * Base URL for server-side fetch() to this app's own API routes.
 * Uses the incoming request Host so dev servers not on :3000 and Vercel previews work.
 */
export async function getServerRequestBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const rawHost = h.get("x-forwarded-host") ?? h.get("host");
    const host = rawHost?.split(",")[0]?.trim();
    if (host) {
      const rawProto = h.get("x-forwarded-proto");
      const proto =
        rawProto?.split(",")[0]?.trim() ||
        (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* no request context (e.g. static) */
  }
  return getBaseUrl();
}
