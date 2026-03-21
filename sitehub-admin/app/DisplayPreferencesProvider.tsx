"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "display-preferences";

export type DateFormat = "ddmmyyyy" | "mmddyyyy";
export type TimeFormat = "12h" | "24h";
export type TableDensity = "compact" | "comfortable" | "spacious";

type DisplayPreferences = {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  tableDensity: TableDensity;
};

const defaults: DisplayPreferences = {
  dateFormat: "ddmmyyyy",
  timeFormat: "24h",
  tableDensity: "comfortable",
};

type ContextValue = DisplayPreferences & {
  setDateFormat: (v: DateFormat) => void;
  setTimeFormat: (v: TimeFormat) => void;
  setTableDensity: (v: TableDensity) => void;
};

const DisplayPreferencesContext = createContext<ContextValue | null>(null);

function loadPreferences(): DisplayPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<DisplayPreferences>;
    return {
      dateFormat: parsed.dateFormat ?? defaults.dateFormat,
      timeFormat: parsed.timeFormat ?? defaults.timeFormat,
      tableDensity: parsed.tableDensity ?? defaults.tableDensity,
    };
  } catch {
    return defaults;
  }
}

function savePreferences(prefs: DisplayPreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function useDisplayPreferences() {
  const ctx = useContext(DisplayPreferencesContext);
  if (!ctx) return defaults as ContextValue;
  return ctx;
}

/** Classes for table density - use in custom tables to match Display preference */
export const TABLE_DENSITY_CLASSES: Record<TableDensity, { table: string; th: string; td: string }> = {
	compact: { table: "text-xs", th: "px-3 py-2", td: "px-3 py-2" },
	comfortable: { table: "text-sm", th: "px-4 py-3", td: "px-4 py-3" },
	spacious: { table: "text-base", th: "px-5 py-4", td: "px-5 py-4" },
};

export function useTableDensityClasses() {
	const { tableDensity } = useDisplayPreferences();
	return TABLE_DENSITY_CLASSES[tableDensity] ?? TABLE_DENSITY_CLASSES.comfortable;
}

export function formatDate(
  date: Date | string | number | null | undefined,
  options?: { dateFormat?: DateFormat }
): string {
  if (!date) return "—";
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const format = options?.dateFormat ?? loadPreferences().dateFormat;
  if (format === "mmddyyyy") {
    return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
  }
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatTime(
  date: Date | string | number | null | undefined,
  options?: { timeFormat?: TimeFormat }
): string {
  if (!date) return "—";
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const format = options?.timeFormat ?? loadPreferences().timeFormat;
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: format === "24h" ? "2-digit" : undefined,
    hour12: format === "12h",
  });
}

export function formatDateTime(
  date: Date | string | number | null | undefined,
  options?: { dateFormat?: DateFormat; timeFormat?: TimeFormat }
): string {
  if (!date) return "—";
  const d = typeof date === "object" && "getTime" in date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const prefs = loadPreferences();
  const df = options?.dateFormat ?? prefs.dateFormat;
  const tf = options?.timeFormat ?? prefs.timeFormat;
  const dateStr = formatDate(d, { dateFormat: df });
  const timeStr = formatTime(d, { timeFormat: tf });
  return `${dateStr} ${timeStr}`;
}

export function DisplayPreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<DisplayPreferences>(defaults);

  useEffect(() => {
    queueMicrotask(() => setPrefs(loadPreferences()));
  }, []);

  const update = (partial: Partial<DisplayPreferences>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    savePreferences(next);
  };

  const value: ContextValue = {
    ...prefs,
    setDateFormat: (v) => update({ dateFormat: v }),
    setTimeFormat: (v) => update({ timeFormat: v }),
    setTableDensity: (v) => update({ tableDensity: v }),
  };

  return (
    <DisplayPreferencesContext.Provider value={value}>
      {children}
    </DisplayPreferencesContext.Provider>
  );
}
