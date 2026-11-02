"use server";

import { callRoute, callRouteList } from "@/lib/server/callRoute";
import { GET as getRams } from "@/app/api/rams/route";
import { DELETE as deleteRamsRoute, PATCH as patchRams } from "@/app/api/rams/[id]/route";

export async function fetchRAMS(companyId?: string) {
  const path = companyId ? `/api/rams?companyId=${encodeURIComponent(companyId)}` : "/api/rams";
  return callRouteList(getRams, path);
}

export async function updateRAMSStatus(id: string, status: string) {
  await callRoute(patchRams, `/api/rams/${encodeURIComponent(id)}`, { method: "PATCH", body: { status }, params: { id } });
}

export async function deleteRAMS(id: string) {
  await callRoute(deleteRamsRoute, `/api/rams/${encodeURIComponent(id)}`, { method: "DELETE", params: { id } });
}
