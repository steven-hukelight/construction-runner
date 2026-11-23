"use client";

import Image from "next/image";
import Link from "next/link";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

type MarketingHeaderProps = {
  current?: "home" | "contact";
};

export default function MarketingHeader({ current = "home" }: MarketingHeaderProps) {
  const { t: tr } = useDisplayPreferences();

  return (
    <header className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-5">
      <Link href="/" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
        <Image
          src="/icon.png?v=3"
          alt="Construction Runner logo"
          width={56}
          height={56}
          priority
          unoptimized
          className="h-10 w-10 shrink-0 object-contain sm:h-14 sm:w-14"
        />
        <span className="truncate text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
          Construction Runner
        </span>
      </Link>
      <nav className="flex shrink-0 items-center gap-1 sm:gap-3">
        {current === "home" ? (
          <Link
            href="/contact"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-[120ms] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex"
          >
            {tr("Contact")}
          </Link>
        ) : (
          <Link
            href="/"
            className="hidden rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-[120ms] hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:inline-flex"
          >
            {tr("Home")}
          </Link>
        )}
        <Link
          href="/admin/login"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-[120ms] hover:border-blue-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-4"
        >
          {tr("Sign in")}
        </Link>
      </nav>
    </header>
  );
}
