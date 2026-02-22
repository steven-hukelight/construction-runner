"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function ComplianceDrawerSection({
  title,
  description,
  children,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 px-1 text-left font-medium text-gray-900 hover:bg-gray-50 rounded"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="pb-4 px-1">
          {description && (
            <p className="text-sm text-gray-500 mb-2">{description}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
