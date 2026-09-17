"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { DisplayPreferencesProvider } from "./DisplayPreferencesProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DisplayPreferencesProvider>{children}</DisplayPreferencesProvider>
    </ThemeProvider>
  );
}
