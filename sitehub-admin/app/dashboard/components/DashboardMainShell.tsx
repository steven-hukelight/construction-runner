"use client";

import type { ReactNode } from "react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { useTheme } from "@/app/ThemeProvider";

export function DashboardMainShell({ children }: { children: ReactNode }) {
  const {
    dashboardBackgroundImageUrl,
    dashboardBackgroundBlur,
    dashboardBackgroundOverlay,
  } = useDisplayPreferences();
  const { resolvedTheme } = useTheme();

  const url = dashboardBackgroundImageUrl?.trim() ?? "";
  const hasBg = url.length > 0;

  return (
    <main
      className={`main-content flex flex-col relative min-h-0 ${hasBg ? "main-content--custom-bg" : ""}`}
    >
      {hasBg ? (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
          {/* Oversized layer so blur does not show hard edges */}
          <div
            className="absolute inset-[-12%] bg-cover bg-center bg-no-repeat motion-reduce:transform-none"
            style={{
              backgroundImage: `url(${url})`,
              filter: dashboardBackgroundBlur ? "blur(36px)" : "none",
              transform: "scale(1.06)",
            }}
          />
          <div
            className="absolute inset-0 backdrop-blur-[1px]"
            style={{
              backgroundColor:
                resolvedTheme === "dark" ? `rgba(15, 23, 42, ${dashboardBackgroundOverlay})` : `rgba(255, 255, 255, ${dashboardBackgroundOverlay})`,
            }}
          />
        </div>
      ) : null}
      <div className="relative z-[1] flex flex-col flex-1 min-h-0">{children}</div>
    </main>
  );
}
