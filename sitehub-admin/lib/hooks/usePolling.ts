"use client";

import { useCallback, useEffect, useRef } from "react";

type PollingTask = (signal: AbortSignal) => Promise<void>;

/**
 * Runs `task` now and every `intervalMs` while the tab is visible, and again when the tab
 * becomes visible. Never runs two at once; the returned `refresh` queues one more run if a
 * request is already in flight. The in-flight request is aborted on unmount.
 */
export function usePolling(task: PollingTask, intervalMs: number, options: { enabled?: boolean } = {}): () => void {
  const enabled = options.enabled ?? true;
  const taskRef = useRef(task);
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  const run = useCallback(async (force: boolean) => {
    if (!mounted.current) return;
    if (!force && document.hidden) return;
    if (inFlight.current) {
      if (force) rerun.current = true;
      return;
    }
    inFlight.current = true;
    const ac = new AbortController();
    controller.current = ac;
    try {
      await taskRef.current(ac.signal);
    } catch (e) {
      if (!ac.signal.aborted) console.warn("[usePolling]", e);
    } finally {
      inFlight.current = false;
      if (controller.current === ac) controller.current = null;
    }
    if (rerun.current && mounted.current) {
      rerun.current = false;
      void run(true);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    mounted.current = true;
    void run(true);
    const id = window.setInterval(() => void run(false), intervalMs);
    const onVisible = () => {
      if (!document.hidden) void run(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      rerun.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      controller.current?.abort();
    };
  }, [enabled, intervalMs, run]);

  return useCallback(() => void run(true), [run]);
}
