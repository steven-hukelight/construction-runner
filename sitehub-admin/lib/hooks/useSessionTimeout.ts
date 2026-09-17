"use client";

import { useEffect, useCallback } from "react";
import {
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_ABSOLUTE_TIMEOUT_MS,
} from "@/lib/securityConfig";
import { getSessionStartedAtFromClient } from "@/lib/utils/cookies";
import { clearServerAuthCookies } from "@/lib/clientLogout";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"];

/**
 * Session timeout: idle (30 min) + absolute (24h).
 * Redirects to /admin/login?timeout=1 with clear message.
 */
export function useSessionTimeout() {
  const logout = useCallback((reason: "idle" | "absolute" = "idle") => {
    const param = reason === "absolute" ? "expired=1" : "timeout=1";
    void clearServerAuthCookies().finally(() => {
      window.location.href = `/admin/login?${param}`;
    });
  }, []);

  useEffect(() => {
    let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let absoluteTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const startedUnix = getSessionStartedAtFromClient();
    const startedAt = startedUnix != null ? startedUnix * 1000 : null;

    const resetIdleTimer = () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      idleTimeoutId = setTimeout(() => logout("idle"), SESSION_IDLE_TIMEOUT_MS);
    };

    const scheduleAbsolute = () => {
      if (startedAt && SESSION_ABSOLUTE_TIMEOUT_MS > 0) {
        const remaining = startedAt + SESSION_ABSOLUTE_TIMEOUT_MS - Date.now();
        if (remaining <= 0) {
          logout("absolute");
          return;
        }
        absoluteTimeoutId = setTimeout(() => logout("absolute"), remaining);
      }
    };

    resetIdleTimer();
    scheduleAbsolute();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetIdleTimer);
    });

    return () => {
      if (idleTimeoutId) clearTimeout(idleTimeoutId);
      if (absoluteTimeoutId) clearTimeout(absoluteTimeoutId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [logout]);
}
