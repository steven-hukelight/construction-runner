"use server";

import { callRouteList } from "@/lib/server/callRoute";
import { GET as getBriefings } from "@/app/api/briefings/route";

export async function fetchBriefings(companyId?: string) {
  const path = companyId ? `/api/briefings?companyId=${encodeURIComponent(companyId)}` : "/api/briefings";
  return callRouteList(getBriefings, path);
}
