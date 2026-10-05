"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function Input({ label, className = "", ...props }: any) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
      <input
        {...props}
        className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-[120ms] ${className}`}
      />
    </div>
  );
}

export default Input;
