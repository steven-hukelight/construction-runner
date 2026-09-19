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
        "relative rounded-2xl border border-blue-100/80 bg-white p-5 shadow-[0_8px_24px_rgba(37,76,128,0.07)] dark:border-slate-600 dark:bg-slate-800",
        className
      )}
    >
      {children}
    </div>
  );
}
