"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ALARM_LABELS, type AlarmType } from "@/lib/siteAlarms/types";

function londonWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  }).format(new Date(iso));
}

type Row = {
  id: string;
  site_name: string;
  type: AlarmType;
  status: "active" | "stood_down";
  is_drill: boolean;
  raised_by_name: string;
  raised_at: string;
  stood_down_by_name: string | null;
  stood_down_at: string | null;
  stand_down_reason: string | null;
  outcome: string | null;
  counts: { on_site: number; unaccounted: number; need_help: number; safe: number };
};

export default function AlarmsHistoryClient() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [drills, setDrills] = useState<"all" | "only" | "exclude">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = drills === "all" ? "" : `?drills=${drills}`;
    fetch(`/api/alarms${params}`, { credentials: "include", cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Couldn't load alarms");
        setRows(data.alarms ?? []);
      })
      .catch((e: Error) => setError(e.message));
  }, [drills]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["all", "exclude", "only"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setDrills(value)}
            className={`rounded-full px-3 py-1 text-sm ${drills === value ? "bg-slate-900 text-white" : "bg-white border border-slate-200"}`}
          >
            {value === "all" ? "All" : value === "only" ? "Drills only" : "Alarms only"}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {rows && !rows.length && <p className="text-sm text-slate-500">No alarms recorded yet.</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Site</th>
                <th className="px-4 py-2 font-medium">Raised by</th>
                <th className="px-4 py-2 font-medium">Raised at</th>
                <th className="px-4 py-2 font-medium">Stood down</th>
                <th className="px-4 py-2 font-medium">Muster</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {row.is_drill ? "Drill · " : ""}
                    {ALARM_LABELS[row.type]?.name ?? row.type}
                    {row.status === "active" && <span className="ml-2 text-red-600 font-medium">Active</span>}
                  </td>
                  <td className="px-4 py-2">{row.site_name}</td>
                  <td className="px-4 py-2">{row.raised_by_name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{londonWhen(row.raised_at)}</td>
                  <td className="px-4 py-2">
                    {row.stood_down_by_name
                      ? `${row.stood_down_by_name}${row.stood_down_at ? `, ${londonWhen(row.stood_down_at)}` : ""}`
                      : "—"}
                    {row.stand_down_reason ? <div className="text-xs text-slate-500">{row.stand_down_reason}</div> : null}
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/health-and-safety/alarms/${row.id}`} className="text-blue-600 hover:underline">
                      {row.counts.safe}/{row.counts.on_site} safe
                      {row.counts.need_help ? ` · ${row.counts.need_help} need help` : ""}
                      {row.counts.unaccounted ? ` · ${row.counts.unaccounted} missing` : ""}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
