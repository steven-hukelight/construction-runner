"use client";

import { useSessionTimeout } from "@/lib/hooks/useSessionTimeout";

/**
 * Enables idle (30 min) and absolute (24h) session timeout.
 * Redirects to /admin/login?timeout=1 or ?expired=1 when session ends.
 */
export default function SessionTimeoutHandler() {
  useSessionTimeout();
  return null;
}
