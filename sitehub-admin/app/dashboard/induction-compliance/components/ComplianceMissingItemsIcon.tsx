"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  items: string[];
};

export default function ComplianceMissingItemsIcon({ items }: Props) {
  if (!items || items.length === 0) return null;

  const tooltip = items.join("\n");
  return (
    <div
      className="inline-flex cursor-help"
      title={tooltip}
    >
      <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />
    </div>
  );
}
