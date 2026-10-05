"use client";

import { Languages } from "lucide-react";
import { CardSelect } from "@/app/dashboard/components/ui/CardSelect";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import { APP_LOCALES } from "@/lib/i18n/catalog";

export function LanguageSwitcher({
  compact = false,
  className,
  menuPlacement = "down",
}: {
  compact?: boolean;
  className?: string;
  menuPlacement?: "down" | "up";
}) {
  const { locale, setLocale, t } = useDisplayPreferences();
  const items = [
    { id: "system", name: t("System default") },
    ...APP_LOCALES.map((l) => ({ id: l.id, name: l.name })),
  ];

  return (
    <div className={className}>
      <CardSelect
        items={items}
        value={locale}
        onChange={(id) => setLocale(id as typeof locale)}
        icon={Languages}
        fieldLabel={t("Language")}
        variant={compact ? "compact" : "default"}
        menuPlacement={menuPlacement}
        className={compact ? "w-full min-w-0" : "w-full max-w-xs"}
      />
    </div>
  );
}
