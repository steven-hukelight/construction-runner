"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function Providers({ children }: any) {
  useEffect(() => {
    // Sync dark mode on client navigation/hydration
    try {
      const darkMode = localStorage.getItem('darkMode');
      if (darkMode === 'true') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {}

  }, []);
  return <SessionProvider>{children}</SessionProvider>;
}
