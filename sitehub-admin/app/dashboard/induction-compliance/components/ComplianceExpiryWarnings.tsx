"use client";

import React from "react";
import { AlertCircle, Calendar } from "lucide-react";

type ExpiryItem = {
  type: string;
  label: string;
  expiry: Date;
};

type Props = {
  items: ExpiryItem[];
};

function isExpired(expiry: Date): boolean {
  return expiry.getTime() < Date.now();
}

export default function ComplianceExpiryWarnings({ items }: Props) {
  if (!items || items.length === 0) return null;

  const expired = items.filter((i) => isExpired(i.expiry));
  const expiring = items.filter((i) => !isExpired(i.expiry));
  const tooltip = [
    ...expired.map((i) => `${i.label} – expired`),
    ...expiring.map((i) => `${i.label} – ${i.expiry.toLocaleDateString()}`),
  ].join("\n");

  return (
    <div className="inline-flex items-center gap-1 cursor-help" title={tooltip}>
      {expired.length > 0 && (
        <AlertCircle className="h-4 w-4 text-red-500" aria-hidden />
      )}
      {expiring.length > 0 && expired.length === 0 && (
        <Calendar className="h-4 w-4 text-amber-500" aria-hidden />
      )}
    </div>
  );
}
