"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function Input({ label, className = "", ...props }: any) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
      <input
        {...props}
        className={`w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-[#1A1A1A] placeholder:text-[#6E6E6E] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 ${className}`}
      />
    </div>
  );
}

export default Input;
