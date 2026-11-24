"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { usePolling } from "@/lib/hooks/usePolling";

const POLL_INTERVAL_MS = 120_000;

const AutoPausedCountContext = createContext(0);

/** Auto-paused question count for the Health & safety Quiz results badge. */
export function AutoPausedCountProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async (signal: AbortSignal) => {
    const res = await fetch("/api/comprehension/performance?count=auto-paused", {
      cache: "no-store",
      credentials: "include",
      signal,
    });
    if (!res.ok) return;
    const d = await res.json();
    if (!signal.aborted) setCount(typeof d?.count === "number" ? d.count : 0);
  }, []);
  const refresh = usePolling(fetchCount, POLL_INTERVAL_MS);

  useEffect(() => {
    window.addEventListener("comprehension-auto-paused", refresh);
    return () => window.removeEventListener("comprehension-auto-paused", refresh);
  }, [refresh]);

  return <AutoPausedCountContext.Provider value={count}>{children}</AutoPausedCountContext.Provider>;
}

export function useAutoPausedCount(): number {
  return useContext(AutoPausedCountContext);
}
