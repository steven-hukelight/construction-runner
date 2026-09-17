"use client";

import Link from "next/link";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

export function LegalConsentLinks({ className }: { className?: string }) {
  const { t } = useDisplayPreferences();
  return (
    <p className={className ?? "text-xs text-center text-gray-500 mt-2"}>
      {t("By continuing, you agree to our")}{" "}
      <Link
        href="/legal/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {t("Terms of Service")}
      </Link>{" "}
      {t("and")}{" "}
      <Link
        href="/legal/privacy-and-security"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {t("Privacy & Security Policy")}
      </Link>
      .
    </p>
  );
}
