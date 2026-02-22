"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white/50 py-4 px-4">
      <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-gray-600">
        <Link
          href="/legal/privacy-and-security"
          className="text-blue-600 hover:text-blue-700 hover:underline"
        >
          Privacy & Security
        </Link>
      </div>
    </footer>
  );
}
