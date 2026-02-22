"use client";

import { motion } from "framer-motion";
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
  gradient = false, 
  hover = true,
  delay = 0 
}: EnhancedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={hover ? {} : {}}
      className={cn(
        "relative rounded-xl p-6 backdrop-blur-xl overflow-hidden",
        "border border-gray-200/80 shadow-sm",
        "transition-all duration-200",
        gradient && "bg-gradient-to-br from-blue-500/90 via-blue-600/90 to-blue-700/90",
        !gradient && "bg-white/95",
        hover && "hover:shadow-md hover:border-gray-300/80",
        className
      )}
      style={gradient ? {
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(96, 165, 250, 0.2) 0%, transparent 50%)'
      } : {}}
    >
      {gradient && (
        <>
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-cyan-400/15 to-transparent rounded-full blur-3xl" />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
