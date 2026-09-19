"use client";

import type { ComponentType, ReactNode } from "react";

export function TableToolbar({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  if (!title && !subtitle && !actions && !children) return null;
  return (
    <div className="w-full space-y-4">
      {(title || subtitle || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            ) : null}
            {subtitle ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

export function TableNameCell({
  icon: Icon,
  label,
  detail,
  wellClass = "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
}: {
  icon: ComponentType<{ className?: string }>;
  label: ReactNode;
  detail?: ReactNode;
  wellClass?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${wellClass}`}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="truncate font-semibold text-slate-900 dark:text-slate-100">{label || "—"}</div>
        {detail ? <div className="truncate text-xs text-slate-500 dark:text-slate-400">{detail}</div> : null}
      </div>
    </div>
  );
}

export function DataTableShell({
  title,
  subtitle,
  actions,
  extra,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`data-table-wrapper w-full min-w-0 overflow-hidden rounded-2xl border border-blue-100/80 bg-white shadow-[0_8px_24px_rgba(37,76,128,0.07)] dark:border-slate-600 dark:bg-slate-800 ${className}`.trim()}
    >
      {title || subtitle || actions || extra ? (
        <div className="data-table-toolbar border-b border-blue-100/80 bg-white px-5 py-4 dark:border-slate-600 dark:bg-slate-800">
          <TableToolbar title={title} subtitle={subtitle} actions={actions}>
            {extra}
          </TableToolbar>
        </div>
      ) : null}
      {children}
    </div>
  );
}
