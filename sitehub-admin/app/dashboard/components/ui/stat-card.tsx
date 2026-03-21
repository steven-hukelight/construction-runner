"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Premium stat card with floating effect
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

const colorClasses = {
  blue: "from-blue-500 to-blue-600 bg-blue-500",
  green: "from-green-500 to-green-600 bg-green-500",
  cyan: "from-cyan-500 to-cyan-600 bg-cyan-500",
  orange: "from-orange-500 to-orange-600 bg-orange-500",
  sky: "from-sky-500 to-sky-600 bg-sky-500",
};

const iconBgClasses = {
  blue: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
  green: "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400",
  cyan: "bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-400",
  orange: "bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400",
  sky: "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400",
};

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = "blue",
  delay = 0 
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{}}
      className="relative group h-full"
    >
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 shadow-sm hover:shadow-md transition-all duration-200 h-full flex flex-col">
        {/* Animated gradient overlay */}
        <motion.div 
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.08] transition-opacity duration-500",
            colorClasses[color]
          )}
          initial={false}
          animate={{ opacity: 0 }}
          whileHover={{ opacity: 0.08 }}
        />
        
        {/* Decorative blur orb */}
        <div className={cn(
          "absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500",
          colorClasses[color]
        )} />
        
        <div className="relative p-7 flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-6">
            <div className={cn(
              "p-4 rounded-2xl shadow-lg",
              iconBgClasses[color]
            )}>
              <Icon className="w-7 h-7" strokeWidth={2.5} />
            </div>
            
            {trend && (
              <motion.div 
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1",
                  trend.isPositive 
                    ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300" 
                    : "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
                )}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: delay + 0.3 }}
              >
                <span>{trend.isPositive ? "↑" : "↓"}</span>
                <span>{Math.abs(trend.value)}%</span>
              </motion.div>
            )}
          </div>
          
          <div className="mt-auto">
            <p className="text-sm font-medium text-[#6E6E6E] dark:text-slate-400 mb-2 uppercase tracking-wide">{title}</p>
            <motion.p 
              className="text-4xl font-bold bg-gradient-to-br from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.2 }}
            >
              {value}
            </motion.p>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          colorClasses[color]
        )} />
      </div>
    </motion.div>
  );
}
