"use client";

import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface EnhancedCardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  delay?: number;
}

export function EnhancedCard({
  children,
  className,
}: EnhancedCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-slate-600 dark:bg-slate-800",
        className
      )}
    >
      {children}
    </div>
  );
}
