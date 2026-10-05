"use client";

import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "cyan" | "orange" | "sky";
  delay?: number;
}

export function StatCard({
  title,
  value,
  icon: Icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-slate-400">{title}</p>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-gray-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
