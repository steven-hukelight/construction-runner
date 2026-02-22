"use client";

import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";

/**
 * Wrapper that enables 12-hour inactivity session timeout.
 * Redirects to login when user has been inactive for 12 hours.
 */
export default function SessionTimeoutHandler() {
  useSessionTimeout();
  return null;
}
