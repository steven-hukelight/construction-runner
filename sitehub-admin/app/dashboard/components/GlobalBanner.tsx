"use client";

import { useState, useEffect } from "react";

export default function GlobalBanner() {
  const [settings, setSettings] = useState<{
    announcement?: string;
    maintenanceMode?: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/settings/public", { cache: "no-store" })
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => setSettings({ maintenanceMode: false, announcement: "" }));
  }, []);

  if (!settings) return null;
  const hasAnnouncement = !!settings.announcement?.trim();
  const maintenance = !!settings.maintenanceMode;
  if (!hasAnnouncement && !maintenance) return null;

  return (
    <div className="flex-shrink-0 space-y-0 w-full mb-4">
      {maintenance && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-center text-sm font-medium w-full rounded-lg">
          Maintenance mode is active. Some features may be limited.
        </div>
      )}
      {hasAnnouncement && (
        <div className="bg-blue-600 text-white px-4 py-2.5 text-center text-sm w-full rounded-lg">
          {settings.announcement}
        </div>
      )}
    </div>
  );
}
