"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import { canRoleViewNearMiss } from "@/lib/auth/nearMissRoles";
import { usePolling } from "@/lib/hooks/usePolling";

const POLL_INTERVAL_MS = 120_000;

const NearMissCountContext = createContext(0);

/** Unreviewed near-miss count, shared by the sidebar badge and the Health & safety tab badge. */
export function NearMissCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async (signal: AbortSignal) => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!canRoleViewNearMiss(role)) return;
    const params = new URLSearchParams({ count: "unreviewed" });
    if (companyId) params.set("companyId", companyId);
    const res = await fetch(`/api/near-miss?${params}`, { cache: "no-store", credentials: "include", signal });
    if (!res.ok) return;
    const d = await res.json();
    if (!signal.aborted) setCount(typeof d?.count === "number" ? d.count : 0);
  }, []);
  const refresh = usePolling(fetchCount, POLL_INTERVAL_MS);

  useEffect(() => {
    window.addEventListener("near-miss-reviewed", refresh);
    return () => window.removeEventListener("near-miss-reviewed", refresh);
  }, [refresh]);

  return <NearMissCountContext.Provider value={count}>{children}</NearMissCountContext.Provider>;
}

export function useNearMissCount(): number {
  return useContext(NearMissCountContext);
}
