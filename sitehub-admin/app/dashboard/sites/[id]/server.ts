import { cache } from "react";
import { cookies } from "next/headers";
import { getBaseUrl } from "@/lib/url";
import { getServerRequestBaseUrl } from "@/lib/serverRequestBaseUrl";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchSiteImpl(id: string): Promise<any> {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

    const primary = await getServerRequestBaseUrl();
    const bases = [primary, getBaseUrl()].filter(
      (b, i, a) => b && a.indexOf(b) === i
    );

    for (const base of bases) {
      try {
        const res = await fetch(`${base}/api/sites/${encodeURIComponent(id)}`, {
          cache: "no-store",
          headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        });
        if (!res.ok) continue;

        const data = (await res.json()) as Record<string, unknown>;
        if (!data || typeof data !== "object") continue;
        if ("error" in data && data.error) continue;
        return data;
      } catch {
        continue;
      }
    }
  } catch (e) {
    console.error("fetchSite:", e);
  }
  return null;
}

/** One HTTP load per request (layout + page both call this). Never throws — avoids production RSC digest crashes. */
export const fetchSite = cache(fetchSiteImpl);
