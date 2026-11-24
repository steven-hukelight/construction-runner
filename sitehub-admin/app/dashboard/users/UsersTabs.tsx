"use client";

import Link from "next/link";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";

export default function UsersTabs({ tab }: { tab: "people" | "missing" }) {
  const { t } = useDisplayPreferences();

  return (
    <div className="admin-tabs">
      <Link
        href="/dashboard/users"
        className={tab === "people" ? "active" : ""}
        aria-current={tab === "people" ? "page" : undefined}
      >
        {t("People")}
      </Link>
      <Link
        href="/dashboard/users?tab=missing"
        className={tab === "missing" ? "active" : ""}
        aria-current={tab === "missing" ? "page" : undefined}
      >
        {t("Missing details")}
      </Link>
    </div>
  );
}
