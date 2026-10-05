"use client";

import { ChevronRight } from "lucide-react";
import { useDisplayPreferences } from "@/app/DisplayPreferencesProvider";
import type { AttendanceSession } from "./attendanceSessionTypes";
import { getAttendanceRowModel } from "./attendanceRowModel";
import { initialsFromLabel } from "../../components/ui/TableChrome";
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
        const operativeLabel = resolveOperativeLabel(session);
        return (
          <SafetyRecordCard
            key={session.id}
            initials={initialsFromLabel(operativeLabel)}
            title={operativeLabel}
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
              <ChevronRight className="h-4 w-4 text-gray-400" aria-hidden />
            }
          />
        );
      })}
    </div>
  );
}
