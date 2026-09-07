"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

type Site = { id: string; name?: string };

/** Button + popover list — avoids native `<select>` (Chrome breaks in modals / stacked context). */
export function SitePicker({
  sites,
  value,
  onChange,
}: {
  sites: Site[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [open]);

  const label =
    value && sites.length
      ? sites.find((s) => s.id === value)?.name ?? value
      : "Select site…";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm",
          "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "flex items-center justify-between gap-2"
        )}
      >
        <span className="truncate">{label}</span>
        <span className="text-slate-400 shrink-0 text-xs" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          role="listbox"
          className={clsx(
            "absolute z-[10060] mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl",
            "dark:border-slate-600 dark:bg-slate-900"
          )}
        >
          <li>
            <button
              type="button"
              role="option"
              className="w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              — None —
            </button>
          </li>
          {sites.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                className={clsx(
                  "w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800",
                  value === s.id && "bg-blue-50 font-medium dark:bg-slate-800"
                )}
                onClick={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                {s.name ?? s.id}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Month grid of buttons — works in Chrome inside modals (no native selects). */
export function DueDateCalendar({
  valueYmd,
  onChangeYmd,
}: {
  valueYmd: string;
  onChangeYmd: (ymd: string) => void;
}) {
  const initial = useMemo(() => {
    if (valueYmd && /^\d{4}-\d{2}-\d{2}$/.test(valueYmd)) {
      const [y, m, d] = valueYmd.split("-").map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    }
    return new Date();
  }, [valueYmd]);

  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date(initial.getFullYear(), initial.getMonth(), 1)
  );

  useEffect(() => {
    if (valueYmd && /^\d{4}-\d{2}-\d{2}$/.test(valueYmd)) {
      const [y, m, d] = valueYmd.split("-").map(Number);
      setVisibleMonth(new Date(y, (m ?? 1) - 1, 1));
    }
  }, [valueYmd]);

  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = useMemo(() => {
    const out: { day: number | null; key: string }[] = [];
    for (let i = 0; i < firstDow; i++) {
      out.push({ day: null, key: `pad-${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ day: d, key: `d-${d}` });
    }
    while (out.length % 7 !== 0) {
      out.push({ day: null, key: `trail-${out.length}` });
    }
    return out;
  }, [firstDow, daysInMonth]);

  const monthTitle = useMemo(
    () =>
      visibleMonth.toLocaleString("en-GB", { month: "long", year: "numeric" }),
    [visibleMonth]
  );

  const selectDay = useCallback(
    (day: number) => {
      const m = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      onChangeYmd(`${year}-${m}-${dd}`);
    },
    [year, month, onChangeYmd]
  );

  const shiftMonth = useCallback((delta: number) => {
    setVisibleMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }, []);

  const isSelected = (day: number | null) => {
    if (day == null || !valueYmd) return false;
    const m = String(month + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return valueYmd === `${year}-${m}-${dd}`;
  };

  const today = new Date();
  const isToday = (day: number | null) =>
    day != null &&
    year === today.getFullYear() &&
    month === today.getMonth() &&
    day === today.getDate();

  return (
    <div className="rounded-lg border border-gray-200 bg-slate-50/90 p-2 dark:border-slate-600 dark:bg-slate-800/60">
      <div className="mb-1 flex items-center justify-between gap-2 border-b border-slate-200/80 pb-1.5 dark:border-slate-600">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-md p-1.5 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100 sm:text-sm">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
          <span className="truncate">{monthTitle}</span>
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-md p-1.5 text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700 shrink-0"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="mb-0.5 grid grid-cols-7 gap-x-0.5 text-center text-[10px] font-medium uppercase leading-none text-slate-500 sm:text-[11px]">
        {WEEK.map((w) => (
          <div key={w} className="pb-1 pt-0.5">
            {w}
          </div>
        ))}
      </div>
      {/* Implicit rows must be fixed height — Chrome expands auto-rows in nested flex/modals. */}
      <div className="grid w-full grid-cols-7 grid-flow-row gap-x-0.5 gap-y-0.5 [grid-auto-rows:2rem]">
        {cells.map(({ day, key }) =>
          day == null ? (
            <div key={key} className="min-h-0" aria-hidden />
          ) : (
            <button
              key={key}
              type="button"
              onClick={() => selectDay(day)}
              className={clsx(
                "h-full min-h-0 w-full rounded-md text-xs font-medium transition-colors inline-flex items-center justify-center",
                isSelected(day)
                  ? "bg-blue-600 text-white shadow dark:bg-blue-500"
                  : isToday(day)
                    ? "bg-white text-blue-700 ring-1 ring-blue-300 dark:bg-slate-700 dark:text-blue-200"
                    : "text-slate-800 hover:bg-white dark:text-slate-100 dark:hover:bg-slate-700"
              )}
            >
              {day}
            </button>
          )
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-slate-200/60 pt-1.5 dark:border-slate-600">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {valueYmd ? `Selected: ${valueYmd}` : "Optional — tap a day"}
        </p>
        {valueYmd ? (
          <button
            type="button"
            onClick={() => onChangeYmd("")}
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Clear date
          </button>
        ) : null}
      </div>
    </div>
  );
}
