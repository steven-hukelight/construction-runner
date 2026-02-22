"use client";

import React from "react";
import { AlertCircle, Calendar } from "lucide-react";

type Props = {
  items: string[];
};

export default function SupervisorExpiryWarnings({ items }: Props) {
  if (!items || items.length === 0) return null;

  const hasExpired = items.some((i) => i.toLowerCase().includes("expired"));
  const tooltip = items.join("\n");

  return (
    <div className="inline-flex cursor-help" title={tooltip}>
      {hasExpired ? (
        <AlertCircle className="h-4 w-4 text-red-500" aria-hidden />
      ) : (
        <Calendar className="h-4 w-4 text-amber-500" aria-hidden />
      )}
    </div>
  );
}
