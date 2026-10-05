"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

export function SafetyRecordCard({
  icon: Icon,
  accent = "blue",
  title,
  subtitle,
  badges,
  meta,
  actions,
  onClick,
}: {
  icon: LucideIcon;
  accent?: "blue" | "amber" | "red" | "emerald" | "slate";
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  meta?: string[];
  actions?: ReactNode;
  onClick?: () => void;
}) {
  const tile =
    accent === "amber"
      ? "bg-amber-500/12 text-amber-700 dark:text-amber-300"
      : accent === "red"
        ? "bg-red-500/12 text-red-700 dark:text-red-300"
        : accent === "emerald"
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
          : accent === "slate"
            ? "bg-slate-500/12 text-slate-600 dark:text-slate-300"
            : "bg-blue-500/12 text-blue-700 dark:text-blue-300";

  const body = (
    <>
      <span className={clsx("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tile)}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</span>
          {badges}
        </span>
        {subtitle ? (
          <span className="mt-0.5 block text-sm text-slate-600 dark:text-slate-400">{subtitle}</span>
        ) : null}
        {meta && meta.length > 0 ? (
          <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </span>
        ) : null}
        {actions ? <span className="mt-2 flex flex-wrap gap-2">{actions}</span> : null}
      </span>
    </>
  );

  const shell = "flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-slate-900";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={clsx(shell, "hover:border-slate-300 dark:hover:border-slate-500")}>
        {body}
      </button>
    );
  }
  return <div className={shell}>{body}</div>;
}
