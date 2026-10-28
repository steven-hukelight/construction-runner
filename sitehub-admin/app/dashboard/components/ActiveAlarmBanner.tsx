"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/me/active-alarm?plan=0", { credentials: "include", cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAlarms(Array.isArray(data.alarms) ? data.alarms : []);
      } catch {
        /* leave last known */
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

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
