"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { clsx } from "clsx";

export type CardSelectItem = {
  id: string;
  name: string;
  subtitle?: string;
};

const SEARCH_AFTER = 8;

export function CardSelect({
  items,
  value,
  onChange,
  icon: Icon,
  fieldLabel,
  placeholder = "Select…",
  disabled = false,
  allowNone = false,
  noneLabel = "— None —",
  noneValue = "",
  listLabel,
  searchPlaceholder = "Search",
  variant = "default",
  className,
}: {
  items: CardSelectItem[];
  value: string;
  onChange: (id: string) => void;
  icon: ComponentType<{ className?: string }>;
  fieldLabel: string;
  placeholder?: string;
  disabled?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  noneValue?: string;
  listLabel?: string;
  searchPlaceholder?: string;
  variant?: "default" | "compact";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const compact = variant === "compact";

  const selected = items.find((s) => s.id === value);
  const isNone = allowNone && (value === noneValue || (!value && noneValue === ""));
  const label = selected?.name?.trim() || (isNone ? noneLabel : value ? value : placeholder);
  const showSearch = items.length >= SEARCH_AFTER;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.subtitle && s.subtitle.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("keydown", onKey);
    if (showSearch) {
      requestAnimationFrame(() => searchRef.current?.focus());
    }
    return () => {
      document.removeEventListener("mousedown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, showSearch]);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className={clsx("relative", compact && "min-w-[11rem]", className)} ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={clsx(
          "flex w-full items-center text-left shadow-sm transition",
          "bg-white dark:bg-slate-900",
          compact ? "gap-2 rounded-xl border px-2.5 py-1.5" : "gap-3 rounded-2xl border px-3 py-2.5",
          open
            ? "border-blue-400 ring-2 ring-blue-500/20"
            : "border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span
          className={clsx(
            "flex shrink-0 items-center justify-center rounded-xl bg-blue-500/12 text-blue-600 dark:text-blue-300",
            compact ? "h-8 w-8" : "h-10 w-10"
          )}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {fieldLabel}
          </span>
          <span
            className={clsx(
              "block truncate font-semibold",
              compact ? "text-xs" : "text-sm",
              selected || isNone ? "text-slate-900 dark:text-slate-100" : "text-slate-400"
            )}
          >
            {disabled && !selected && !isNone ? "Loading…" : label}
          </span>
          {!compact && selected?.subtitle ? (
            <span className="block truncate text-xs text-slate-500">{selected.subtitle}</span>
          ) : null}
        </span>
        <span
          className={clsx(
            "flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
            compact ? "h-7 w-7" : "h-8 w-8"
          )}
        >
          <ChevronDown
            className={clsx("h-4 w-4 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </span>
      </button>

      {open && !disabled ? (
        <div className="relative z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-600 dark:bg-slate-900">
          {showSearch ? (
            <div className="border-b border-slate-100 p-2 dark:border-slate-700">
              <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-slate-900 outline-none dark:text-slate-100"
                />
              </label>
            </div>
          ) : null}
          <ul role="listbox" aria-label={listLabel || fieldLabel} className="max-h-56 overflow-y-auto p-1.5">
            {allowNone ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={isNone}
                  onClick={() => pick(noneValue)}
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm text-slate-500",
                    "hover:bg-slate-50 dark:hover:bg-slate-800",
                    isNone && "bg-blue-50/80 dark:bg-slate-800"
                  )}
                >
                  {noneLabel}
                </button>
              </li>
            ) : null}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-slate-500">No matches</li>
            ) : (
              filtered.map((s) => {
                const active = s.id === value;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => pick(s.id)}
                      className={clsx(
                        "flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition",
                        "hover:bg-slate-50 dark:hover:bg-slate-800",
                        active && "bg-blue-50 dark:bg-blue-500/15"
                      )}
                    >
                      <span
                        className={clsx(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          active
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {s.name}
                        </span>
                        {s.subtitle ? (
                          <span className="block truncate text-xs text-slate-500">{s.subtitle}</span>
                        ) : null}
                      </span>
                      {active ? (
                        <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden />
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
