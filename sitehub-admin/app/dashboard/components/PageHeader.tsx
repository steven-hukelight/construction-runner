import React, { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  /** Tighter spacing when the page primary content should sit close below (e.g. data tables). */
  compact?: boolean;
}

function PageHeader({ title, description, action = null, children = null, compact = false }: PageHeaderProps) {
  return (
    <div className={compact ? "mb-4" : "mb-8"}>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-slate-800">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
            {description && (
              <p className="mt-1 max-w-3xl text-sm text-gray-500 dark:text-slate-400">{description}</p>
            )}
          </div>
          {(action || children) && (
            <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-3 sm:ml-auto">
              {action}
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PageHeader);
