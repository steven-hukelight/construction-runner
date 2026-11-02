"use server";

import { callRoute, callRouteList } from "@/lib/server/callRoute";
import { GET as getSites, POST as postSite } from "@/app/api/sites/route";
import { PATCH as patchSite } from "@/app/api/sites/[id]/route";

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    if (typeof j?.error === "string" && j.error) return j.error;
  } catch {
    /* ignore */
  }
  return fallback;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchSites(companyId?: string) {
  const path = companyId ? `/api/sites?companyId=${encodeURIComponent(companyId)}` : "/api/sites";
  return callRouteList(getSites, path);
}

export async function createSite(data: any) {
  const res = await callRoute(postSite, "/api/sites", { method: "POST", body: data });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to create site"));
  return res.json();
}

export async function updateSite(id: string, data: any) {
  const res = await callRoute(patchSite, `/api/sites/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: data,
    params: { id },
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to update site"));
  return res.json();
}
