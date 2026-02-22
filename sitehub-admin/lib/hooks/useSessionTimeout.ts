"use client";

import { useEffect, useCallback } from "react";

const INACTIVITY_MS = 12 * 60 * 60 * 1000; // 12 hours (GDPR/session security)
const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"];

/**
 * Session timeout: redirects to login after 12 hours of inactivity.
 * Resets the timer on user activity.
 */
export function useSessionTimeout() {
  const logout = useCallback(() => {
    try {
      ["role", "companyId", "user_email", "uid", "impersonating"].forEach(
        (name) => (document.cookie = `${name}=; path=/; max-age=0`)
      );
    } catch {
      /* document.cookie access denied */
    }
    window.location.href = "/login?timeout=1";
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(logout, INACTIVITY_MS);
    };

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [logout]);
}
