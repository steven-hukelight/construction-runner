"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { headers } from "next/headers";

export async function fetchDashboardMetrics() {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const fetchHeaders: HeadersInit = cookieHeader ? { Cookie: cookieHeader } : {};

  const [sitesRes, ramsRes, usersRes] = await Promise.all([
    fetch(`${base}/api/sites`, { cache: "no-store", headers: fetchHeaders }),
    fetch(`${base}/api/rams`, { cache: "no-store", headers: fetchHeaders }),
    fetch(`${base}/api/users`, { cache: "no-store", headers: fetchHeaders }),
  ]);

  const [sites, rams, users] = await Promise.all([
    sitesRes.json(),
    ramsRes.json(),
    usersRes.json(),
  ]);

  return {
    totalSites: sites.length,
    activeRAMS: rams.filter((r: any) => r.status === "PENDING").length,
    totalUsers: users.length,
  };
}
