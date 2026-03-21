"use client";

import { SessionProvider } from "next-auth/react";
import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { DisplayPreferencesProvider } from "./DisplayPreferencesProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DisplayPreferencesProvider>
        <SessionProvider>{children}</SessionProvider>
      </DisplayPreferencesProvider>
    </ThemeProvider>
  );
}
