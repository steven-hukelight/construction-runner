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
      <div className="rounded-2xl border border-blue-100/80 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(37,76,128,0.07)] dark:border-slate-600 dark:bg-slate-800 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 border-l-4 border-blue-600 pl-4">
            <h1
              className="text-2xl font-semibold tracking-tight text-[#1A1A1A] dark:text-slate-100 sm:text-3xl"
              style={{ letterSpacing: "-0.02em", lineHeight: "1.2" }}
            >
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-3xl text-sm font-normal text-[#6E6E6E] dark:text-slate-400 sm:text-base">
                {description}
              </p>
            )}
          </div>
          {(action || children) && (
            <div className="flex flex-shrink-0 flex-wrap items-center gap-3 sm:pt-1">
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
