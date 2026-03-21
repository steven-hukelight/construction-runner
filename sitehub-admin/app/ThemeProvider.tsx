"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

const THEME_KEY = "theme";
export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light" as Theme,
      resolvedTheme: "light" as ResolvedTheme,
      setTheme: () => {},
    };
  }
  return ctx;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark") return "dark";
  if (stored === "light") return "light";
  if (stored === "system") return "system";
  return "light";
}

function getResolvedTheme(theme: Theme): ResolvedTheme {
  if (theme === "system" && typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const resolved = getResolvedTheme(theme);
  document.documentElement.dataset.theme = resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    queueMicrotask(() => {
      const stored = getStoredTheme();
      setThemeState(stored);
      setResolvedTheme(getResolvedTheme(stored));
      applyTheme(stored);
    });
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = mq.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((value: Theme) => {
    setThemeState(value);
    const resolved = getResolvedTheme(value);
    setResolvedTheme(resolved);
    applyTheme(value);
    localStorage.setItem(THEME_KEY, value);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
