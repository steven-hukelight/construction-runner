"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import { canRoleViewNearMiss } from "@/lib/auth/nearMissRoles";

const POLL_INTERVAL_MS = 120_000;

const NearMissCountContext = createContext(0);

/** Unreviewed near-miss count, shared by the sidebar badge and the Health & Safety tab badge. */
export function NearMissCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!canRoleViewNearMiss(role)) return;
    const params = new URLSearchParams({ count: "unreviewed" });
    if (companyId) params.set("companyId", companyId);
    fetch(`/api/near-miss?${params}`, { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((d) => setCount(typeof d?.count === "number" ? d.count : 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    window.addEventListener("near-miss-reviewed", fetchCount);
    return () => {
      clearInterval(interval);
      window.removeEventListener("near-miss-reviewed", fetchCount);
    };
  }, [fetchCount]);

  return <NearMissCountContext.Provider value={count}>{children}</NearMissCountContext.Provider>;
}

export function useNearMissCount(): number {
  return useContext(NearMissCountContext);
}
