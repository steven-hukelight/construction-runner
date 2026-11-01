"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePolling } from "@/lib/hooks/usePolling";
import { ALARM_LABELS, londonClock, type AlarmType } from "@/lib/siteAlarms/types";

type ActiveAlarm = {
  id: string;
  site_name: string;
  type: AlarmType;
  is_drill: boolean;
  raised_by_name: string;
  raised_at: string;
  can_manage: boolean;
};

export default function ActiveAlarmBanner() {
  const [alarms, setAlarms] = useState<ActiveAlarm[]>([]);

  const load = useCallback(async (signal: AbortSignal) => {
    const res = await fetch("/api/me/active-alarm?plan=0", { credentials: "include", cache: "no-store", signal });
    if (!res.ok) return;
    const data = await res.json();
    if (!signal.aborted) setAlarms(Array.isArray(data.alarms) ? data.alarms : []);
  }, []);
  usePolling(load, 15_000);

  if (!alarms.length) return null;

  return (
    <div className="flex-shrink-0 space-y-2 w-full mb-4">
      {alarms.map((alarm) => {
        const label = ALARM_LABELS[alarm.type]?.name ?? "Alarm";
        return (
          <Link
            key={alarm.id}
            href={`/dashboard/health-and-safety/alarms/${alarm.id}`}
            className="block rounded-lg bg-red-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-red-700"
          >
            {alarm.is_drill ? "DRILL · " : ""}
            {label} at {alarm.site_name} · raised by {alarm.raised_by_name}, {londonClock(alarm.raised_at)}
            {alarm.can_manage ? " · Open muster board" : ""}
          </Link>
        );
      })}
    </div>
  );
}
