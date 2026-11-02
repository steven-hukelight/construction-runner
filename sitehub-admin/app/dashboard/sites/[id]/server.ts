import { cache } from "react";
import { callRoute } from "@/lib/server/callRoute";
import { GET as getSite } from "@/app/api/sites/[id]/route";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function fetchSiteImpl(id: string): Promise<any> {
  try {
    const res = await callRoute(getSite, `/api/sites/${encodeURIComponent(id)}`, { params: { id } });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, unknown>;
    if (!data || typeof data !== "object") return null;
    if ("error" in data && data.error) return null;
    return data;
  } catch (e) {
    console.error("fetchSite:", e);
    return null;
  }
}

/** One load per request (layout + page both call this). Never throws, avoids production RSC digest crashes. */
export const fetchSite = cache(fetchSiteImpl);
