"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { DisplayPreferencesProvider } from "./DisplayPreferencesProvider";
import { ConfirmProvider } from "./dashboard/components/ui/ConfirmProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <DisplayPreferencesProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </DisplayPreferencesProvider>
    </ThemeProvider>
  );
}
