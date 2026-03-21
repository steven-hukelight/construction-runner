"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/90 py-4 px-4">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-slate-400">
        <Link
          href="/legal/privacy-and-security"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
        >
          Privacy & Security
        </Link>
      </div>
    </footer>
  );
}
