"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { callRouteList } from "@/lib/server/callRoute";
import { GET as getSites } from "@/app/api/sites/route";
import { GET as getRams } from "@/app/api/rams/route";
import { GET as getUsers } from "@/app/api/users/route";

export async function fetchDashboardMetrics() {
  const [sites, rams, users] = await Promise.all([
    callRouteList(getSites, "/api/sites"),
    callRouteList<any>(getRams, "/api/rams"),
    callRouteList(getUsers, "/api/users"),
  ]);

  return {
    totalSites: sites.length,
    activeRAMS: rams.filter((r: any) => r.status === "PENDING").length,
    totalUsers: users.length,
  };
}
