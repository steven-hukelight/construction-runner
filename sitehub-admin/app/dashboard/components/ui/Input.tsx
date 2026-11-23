"use client";

import { InputHTMLAttributes, useId } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  className?: string;
};

export function Input({ label, className = "", id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="space-y-1">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-slate-300">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        {...props}
        className={`w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-900 placeholder:text-gray-500 transition-colors duration-[120ms] focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 ${className}`}
      />
    </div>
  );
}

export default Input;
