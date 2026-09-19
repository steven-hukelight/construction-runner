"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

const iconWell: Record<NonNullable<StatCardProps["color"]>, string> = {
  blue: "bg-blue-100 text-blue-700",
  green: "bg-teal-100 text-teal-700",
  cyan: "bg-indigo-100 text-indigo-700",
  orange: "bg-orange-100 text-orange-700",
  sky: "bg-sky-100 text-sky-700",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-blue-100/80 bg-white p-5 shadow-[0_8px_24px_rgba(37,76,128,0.07)] dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", iconWell[color])}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
        {value}
      </p>
    </div>
  );
}
