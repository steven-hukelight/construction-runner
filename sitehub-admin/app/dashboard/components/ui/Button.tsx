"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary:
      "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 hover:border-gray-300 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "px-4 py-2 text-sm h-9",
    md: "px-6 py-2.5 text-sm h-10",
    lg: "px-8 py-3 text-base h-11",
  };

  const base = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.md;

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${base} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
