"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { localCalendarDayToUtcIsoBounds } from "@/lib/attendanceLocalDayWindow";
import { usePolling } from "@/lib/hooks/usePolling";
import type {
  AttendanceLookups,
  AttendanceProfile,
  AttendanceSite,
  AttendanceUser,
} from "./live/useAttendanceLookups";
import AttendanceFilters from "./live/AttendanceFilters";
import AttendanceTable from "./live/AttendanceTable";
import AttendanceCards from "./live/AttendanceCards";
import SessionDetailsDrawer from "./live/SessionDetailsDrawer";
import type { AttendanceLog } from "./live/attendanceSessionTypes";
import type { AttendanceSession } from "./live/attendanceSessionTypes";
import { parseAbsentForDate } from "@/lib/attendanceAbsent";
import {
  buildAttendanceSessions,
  getPrimaryAttendanceLog,
  isActiveWorkSession,
} from "./live/attendanceSessionUtils";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type User = AttendanceUser;
type Profile = AttendanceProfile;
type Site = AttendanceSite;

const LIVE_REFRESH_MS = 15_000;

function resolveOperativeFromLog(
  log: AttendanceLog | null,
  profileByUserId: Map<string, Profile>,
  userMap: Map<string, User>
): string {
  if (!log) return "—";
  const directPreferred = [log.name, log.displayName, log.operativeName];
  const direct = directPreferred.find((n) => n && String(n).trim());
  if (direct) return String(direct);
  const idHints = [log.operativeId, log.userId, log.uid, log.user_id];
  const id = idHints.find((x) => x && String(x).trim());
  if (id) {
    const p = profileByUserId.get(String(id));
    if (p?.displayName) return String(p.displayName);
    const u = userMap.get(String(id));
    if (u?.name) return String(u.name);
    if (u?.email) return String(u.email).split("@")[0];
    return "—";
  }
  if (log.userName && String(log.userName).trim()) return String(log.userName);
  return "—";
}

function resolveSiteFromLog(log: AttendanceLog | null, siteMap: Map<string, Site>): string {
  if (!log) return "—";
  const siteNameHints = [log.siteName, log.site?.name];
  const siteIdHints = [log.siteId, log.site_id, log.site?.id];
  const sname = siteNameHints.find((n) => n && String(n).trim());
  if (sname) return String(sname);
  const sid = siteIdHints.find((x) => x && String(x).trim());
  if (sid) {
    const s = siteMap.get(String(sid));
    if (s?.name) return String(s.name);
    return "—";
  }
  return "—";
}

export default function LiveAttendance({
  refreshTrigger = 0,
  selectedDate: selectedDateProp,
  initialSiteId = null,
  lookups,
}: {
  refreshTrigger?: number;
  selectedDate?: string;
  initialSiteId?: string | null;
  lookups: AttendanceLookups;
}) {
  const { users, sites, profiles, companyMap } = lookups;
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selectedSiteId, setSelectedSiteId] = useState<string>(initialSiteId || "all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [localDate, setLocalDate] = useState<string>(() => todayStr());
  const selectedDate = selectedDateProp ?? localDate;
  const isToday = selectedDate === todayStr();

  const [activeSessionsOnly, setActiveSessionsOnly] = useState(false);
  const [drawerSession, setDrawerSession] = useState<AttendanceSession | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [listEpoch, setListEpoch] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const logsForGrouping = useMemo(() => {
    if (isToday) return logs;
    return logs.filter((l) => {
      if (selectedSiteId !== "all") {
        const sid = String(l.siteId ?? l.site_id ?? "").trim();
        if (sid !== selectedSiteId) return false;
      }
      if (selectedUserId !== "all") {
        const uid = String(l.userId ?? l.user_id ?? l.operativeId ?? "").trim();
        if (uid !== selectedUserId) return false;
      }
      return true;
    });
  }, [logs, isToday, selectedSiteId, selectedUserId]);

  const sessions = useMemo(() => buildAttendanceSessions(logsForGrouping), [logsForGrouping]);

  const displayedSessions = useMemo(() => {
    const list = activeSessionsOnly ? sessions.filter(isActiveWorkSession) : sessions;
    return [...list].sort((a, b) => Number(isActiveWorkSession(b)) - Number(isActiveWorkSession(a)));
  }, [sessions, activeSessionsOnly]);

  const requestKey = `${selectedDate}|${selectedSiteId}|${selectedUserId}|${refreshTrigger}|${listEpoch}`;
  const requestKeyRef = useRef(requestKey);
  const wasTodayRef = useRef(isToday);

  const fetchToday = useCallback(
    async (signal: AbortSignal) => {
      const key = requestKeyRef.current;
      const params = new URLSearchParams({ limit: "500" });
      const bounds = localCalendarDayToUtcIsoBounds(selectedDate);
      if (bounds) {
        params.set("windowStart", bounds.start);
        params.set("windowEnd", bounds.end);
      } else {
        params.set("date", selectedDate);
      }
      if (selectedSiteId !== "all") params.set("siteId", selectedSiteId);
      if (selectedUserId !== "all") params.set("userId", selectedUserId);
      try {
        const res = await fetch(`/api/attendance?${params}`, { cache: "no-store", credentials: "include", signal });
        if (!res.ok) throw new Error(`attendance ${res.status}`);
        const data = await res.json();
        if (key !== requestKeyRef.current) return;
        setLogs(Array.isArray(data) ? (data as AttendanceLog[]) : []);
        setStatus("ready");
      } catch (e) {
        if (signal.aborted || key !== requestKeyRef.current) return;
        setStatus((s) => (s === "loading" ? "error" : s));
        throw e;
      }
    },
    [selectedDate, selectedSiteId, selectedUserId],
  );
  const refreshToday = usePolling(fetchToday, LIVE_REFRESH_MS, { enabled: isToday });

  useEffect(() => {
    const wasToday = wasTodayRef.current;
    wasTodayRef.current = isToday;
    if (requestKeyRef.current === requestKey) return;
    requestKeyRef.current = requestKey;
    queueMicrotask(() => setStatus("loading"));
    if (isToday && wasToday) refreshToday();
  }, [requestKey, isToday, refreshToday]);

  useEffect(() => {
    if (isToday) return;
    const ac = new AbortController();
    const params = new URLSearchParams({ date: selectedDate, limit: "500" });
    void (async () => {
      try {
        const res = await fetch(`/api/attendance/archive?${params}`, {
          cache: "no-store",
          credentials: "include",
          signal: ac.signal,
        });
        if (!res.ok) throw new Error(`archive ${res.status}`);
        const data = await res.json();
        if (ac.signal.aborted) return;
        setLogs(Array.isArray(data) ? (data as AttendanceLog[]) : []);
        setStatus("ready");
      } catch {
        if (!ac.signal.aborted) setStatus("error");
      }
    })();
    return () => ac.abort();
  }, [isToday, selectedDate, refreshTrigger, listEpoch]);

  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => {
      if (u.id) m.set(u.id, u);
    });
    return m;
  }, [users]);

  const siteMap = useMemo(() => {
    const m = new Map<string, Site>();
    sites.forEach((s) => {
      if (s.id) m.set(s.id, s);
    });
    return m;
  }, [sites]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, Profile>();
    profiles.forEach((p) => {
      const uid = p.id ?? p.userId;
      if (uid) m.set(String(uid), p);
    });
    return m;
  }, [profiles]);

  const userIdToCompanyId = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => {
      const cid = u.company_id ?? u.companyId;
      if (u.id && cid && String(cid).trim()) m.set(String(u.id), String(cid).trim());
    });
    return m;
  }, [users]);

  const resolveOperativeLabel = useCallback(
    (session: AttendanceSession) => {
      const log = getPrimaryAttendanceLog(session);
      return resolveOperativeFromLog(log, profileByUserId, userMap);
    },
    [profileByUserId, userMap]
  );

  const resolveSiteLabel = useCallback(
    (session: AttendanceSession) => {
      const log = getPrimaryAttendanceLog(session);
      return resolveSiteFromLog(log, siteMap);
    },
    [siteMap]
  );

  const resolveCompanyLabel = useCallback(
    (session: AttendanceSession): string | null => {
      const log = getPrimaryAttendanceLog(session);
      if (!log) return null;
      const idHints = [log.operativeId, log.userId, log.uid, log.user_id];
      const uid = idHints.find((x) => x && String(x).trim());
      const cidRaw =
        log.companyId ||
        log.company_id ||
        (uid ? userIdToCompanyId.get(String(uid)) : undefined);
      const cid = cidRaw && String(cidRaw).trim() ? String(cidRaw).trim() : "";
      if (!cid) return null;
      const name = companyMap[cid];
      if (name && String(name).trim()) return String(name).trim();
      return null;
    },
    [companyMap, userIdToCompanyId]
  );

  const drawerCompany = drawerSession ? resolveCompanyLabel(drawerSession) : null;

  return (
    <div className="space-y-4">
      <AttendanceFilters
        sites={sites}
        users={users}
        selectedSiteId={selectedSiteId}
        selectedUserId={selectedUserId}
        onSiteChange={setSelectedSiteId}
        onUserChange={setSelectedUserId}
        showDatePicker={selectedDateProp == null}
        selectedDate={selectedDate}
        onDateChange={(v) => setLocalDate(v || todayStr())}
        onTodayClick={() => setLocalDate(todayStr())}
        isToday={isToday}
        activeSessionsOnly={activeSessionsOnly}
        onActiveSessionsOnlyChange={setActiveSessionsOnly}
      />

      {displayedSessions.length > 0 ? (
        <AttendanceCards
          sessions={displayedSessions}
          resolveOperativeLabel={resolveOperativeLabel}
          resolveSiteLabel={resolveSiteLabel}
          now={now}
          onOpenSession={setDrawerSession}
        />
      ) : null}
      <AttendanceTable
        sessions={displayedSessions}
        resolveOperativeLabel={resolveOperativeLabel}
        resolveSiteLabel={resolveSiteLabel}
        now={now}
        onOpenSession={setDrawerSession}
        emptyMessage={
          status === "loading"
            ? "Loading attendance…"
            : status === "error"
              ? "Could not load attendance."
              : activeSessionsOnly && sessions.length > 0
                ? "No active entries match this filter."
                : isToday
                  ? "No entries to show."
                  : `No entries for ${selectedDate}.`
        }
      />

      <SessionDetailsDrawer
        session={drawerSession}
        companyLabel={drawerCompany}
        open={drawerSession != null}
        onClose={() => setDrawerSession(null)}
        onClearAbsent={
          drawerSession?.kind === "absent"
            ? async () => {
                const uid = String(drawerSession.userId ?? "").trim();
                const ymd = parseAbsentForDate(drawerSession.absentLog?.notes ?? null);
                const cid = uid ? userIdToCompanyId.get(uid) : undefined;
                const res = await fetch("/api/attendance", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "clear_absent",
                    operativeId: uid,
                    absentDate: ymd,
                    companyId: cid,
                  }),
                });
                const data = (await res.json().catch(() => ({}))) as {
                  error?: string;
                  message?: string;
                };
                if (!res.ok) {
                  throw new Error(data.message || data.error || "Could not clear absent");
                }
                setListEpoch((n) => n + 1);
              }
            : undefined
        }
      />
    </div>
  );
}
