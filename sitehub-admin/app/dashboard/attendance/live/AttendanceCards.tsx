"use client";

import { User } from "lucide-react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import type { AttendanceSession } from "./attendanceSessionTypes";
import { getAttendanceRowModel } from "./attendanceRowModel";
import { SafetyRecordCard } from "../../components/ui/SafetyRecordCard";

export default function AttendanceCards({
  sessions,
  resolveOperativeLabel,
  resolveSiteLabel,
  now,
  onOpenSession,
}: {
  sessions: AttendanceSession[];
  resolveOperativeLabel: (session: AttendanceSession) => string;
  resolveSiteLabel: (session: AttendanceSession) => string;
  now: Date;
  onOpenSession: (session: AttendanceSession) => void;
}) {
  const { timeFormat } = useDisplayPreferences();

  return (
    <div className="space-y-3 md:hidden">
      {sessions.map((session) => {
        const { timeLines, durationLabel, statusLabel, active } = getAttendanceRowModel(
          session,
          now,
          timeFormat
        );
        const accent = session.kind === "absent" ? "amber" : active ? "emerald" : "slate";
        return (
          <SafetyRecordCard
            key={session.id}
            icon={User}
            accent={accent}
            title={resolveOperativeLabel(session)}
            subtitle={resolveSiteLabel(session)}
            badges={
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                  active
                    ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                    : session.kind === "absent"
                      ? "bg-amber-500/12 text-amber-900 dark:text-amber-100"
                      : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                }`}
              >
                {statusLabel}
              </span>
            }
            meta={[...timeLines, durationLabel !== "—" ? durationLabel : ""].filter(Boolean)}
            onClick={() => onOpenSession(session)}
            actions={
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">Details</span>
            }
          />
        );
      })}
    </div>
  );
}
