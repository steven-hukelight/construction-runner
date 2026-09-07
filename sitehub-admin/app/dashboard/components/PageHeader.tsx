
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A] mb-2" style={{ letterSpacing: '-0.02em', lineHeight: '1.2' }}>
            {title}
          </h1>
          {description && (
            <p className="text-base text-[#6E6E6E] font-normal">{description}</p>
          )}
        </div>
        {(action || children) && (
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {action}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(PageHeader);
