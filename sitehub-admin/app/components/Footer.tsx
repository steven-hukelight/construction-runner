"use client";

import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";

const HIDE_ON = new Set(["/", "/admin/login", "/contact"]);

export default function Footer() {
  const pathname = usePathname();
  if (pathname && (HIDE_ON.has(pathname) || pathname.startsWith("/dashboard"))) return null;
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-slate-600 bg-white/50 dark:bg-slate-800/90 py-4 px-4">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-slate-400">
        <LanguageSwitcher compact className="min-w-[12rem]" />
      </div>
    </footer>
  );
}
