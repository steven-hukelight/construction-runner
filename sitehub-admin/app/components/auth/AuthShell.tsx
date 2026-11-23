"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import MarketingShell from "@/app/components/marketing/MarketingShell";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <MarketingShell>
      <div className="flex min-h-screen flex-col px-4 py-8 sm:px-6">
        <div className={`mx-auto w-full ${wide ? "max-w-4xl" : "max-w-md"}`}>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8">
            <div className="mb-6 text-center">
              <Link
                href="/"
                className="mx-auto mb-4 inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Image
                  src="/icon.png?v=3"
                  alt="Construction Runner"
                  width={56}
                  height={56}
                  className="h-14 w-14 object-contain"
                  unoptimized
                  priority
                />
              </Link>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
              {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
            </div>
            {children}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 rounded-xl bg-slate-900/80 px-4 py-3 text-sm text-white">
            <Link
              href="/"
              className="font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Home
            </Link>
            {footer}
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
