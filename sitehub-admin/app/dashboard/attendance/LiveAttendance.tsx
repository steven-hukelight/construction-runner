"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { localCalendarDayToUtcIsoBounds } from "@/lib/attendanceLocalDayWindow";
import AttendanceFilters from "./live/AttendanceFilters";
import AttendanceTable from "./live/AttendanceTable";
import SessionDetailsDrawer from "./live/SessionDetailsDrawer";
import type { AttendanceLog } from "./live/attendanceSessionTypes";
import type { AttendanceSession } from "./live/attendanceSessionTypes";
import {
  buildAttendanceSessions,
  getPrimaryAttendanceLog,
  isActiveWorkSession,
} from "./live/attendanceSessionUtils";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type User = {
  id: string;
  name?: string;
  display_name?: string;
  email?: string;
  displayName?: string;
  company_id?: string;
  companyId?: string;
};
type Profile = { id?: string; userId?: string; displayName?: string };
type Site = { id: string; name?: string };

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

const normalizeUser = (value: unknown): User | null => {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const id = asString(obj.id);
  if (!id) return null;
  return {
    id,
    name: asString(obj.name),
    display_name: asString(obj.display_name),
    displayName: asString(obj.displayName),
    email: asString(obj.email),
    company_id: asString(obj.company_id),
    companyId: asString(obj.companyId),
  };
};

const normalizeProfile = (value: unknown): Profile | null => {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const pid = asString(obj.id ?? obj.userId);
  if (!pid) return null;
  return {
    id: pid,
    userId: asString(obj.userId),
    displayName: asString(obj.displayName ?? obj.display_name),
  };
};

const normalizeSite = (value: unknown): Site | null => {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  const id = asString(obj.id);
  if (!id) return null;
  return {
    id,
    name: asString(obj.name),
  };
};

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
}: { refreshTrigger?: number; selectedDate?: string }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [localDate, setLocalDate] = useState<string>(() => todayStr());
  const selectedDate = selectedDateProp ?? localDate;
  const isToday = selectedDate === todayStr();

  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [activeSessionsOnly, setActiveSessionsOnly] = useState(false);
  const [drawerSession, setDrawerSession] = useState<AttendanceSession | null>(null);
  const [now, setNow] = useState(() => new Date());

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
    if (!activeSessionsOnly) return sessions;
    return sessions.filter(isActiveWorkSession);
  }, [sessions, activeSessionsOnly]);

  useEffect(() => {
    const fetchFromApi = async () => {
      try {
        let json: AttendanceLog[] = [];
        if (isToday) {
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
          const res = await fetch(`/api/attendance?${params}`, {
            cache: "no-store",
            credentials: "include",
          });
          const data = await res.json();
          json = Array.isArray(data) ? (data as AttendanceLog[]) : [];
        } else {
          const params = new URLSearchParams({ date: selectedDate, limit: "500" });
          const res = await fetch(`/api/attendance/archive?${params}`, {
            cache: "no-store",
            credentials: "include",
          });
          const data = await res.json();
          if (Array.isArray(data)) {
            json = data as AttendanceLog[];
          } else if (data?.error) {
            json = [];
          } else {
            json = [];
          }
        }
        setLogs(json);
      } catch {
        setLogs([]);
      }
    };

    fetchFromApi();
    const interval = isToday ? setInterval(fetchFromApi, 15000) : undefined;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [refreshTrigger, selectedDate, selectedSiteId, selectedUserId, isToday]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersRes, sitesRes, profilesRes, companiesRes, meRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store", credentials: "include" }),
          fetch("/api/sites", { cache: "no-store", credentials: "include" }),
          fetch("/api/profiles", { cache: "no-store", credentials: "include" }),
          fetch("/api/companies", { cache: "no-store", credentials: "include" }),
          fetch("/api/me", { cache: "no-store", credentials: "include" }),
        ]);
        if (!cancelled) {
          const [usersJson, sitesJson, profilesJson, companiesJson, meJson] = await Promise.all([
            usersRes.json(),
            sitesRes.json(),
            profilesRes.json(),
            companiesRes.json(),
            meRes.json().catch(() => ({})),
          ]);
          setUsers(Array.isArray(usersJson) ? usersJson.map(normalizeUser).filter(Boolean) as User[] : []);
          setSites(Array.isArray(sitesJson) ? sitesJson.map(normalizeSite).filter(Boolean) as Site[] : []);
          setProfiles(Array.isArray(profilesJson) ? profilesJson.map(normalizeProfile).filter(Boolean) as Profile[] : []);
          const cm: Record<string, string> = {};
          if (Array.isArray(companiesJson)) {
            companiesJson.forEach((c: { id?: string; name?: string }) => {
              if (c?.id && c?.name) cm[String(c.id)] = String(c.name);
            });
          }
          const meCid = meJson?.companyId ?? meJson?.company_id;
          const meName = meJson?.companyName;
          if (meCid && meName && String(meName).trim()) {
            cm[String(meCid)] = String(meName).trim();
          }
          setCompanyMap(cm);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setSites([]);
          setProfiles([]);
          setCompanyMap({});
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
        <AttendanceTable
          sessions={displayedSessions}
          resolveOperativeLabel={resolveOperativeLabel}
          resolveSiteLabel={resolveSiteLabel}
          now={now}
          onOpenSession={setDrawerSession}
        />
      ) : null}

      {displayedSessions.length === 0 && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {activeSessionsOnly && sessions.length > 0
            ? "No active entries match this filter."
            : isToday
              ? "No entries to show."
              : `No entries for ${selectedDate}.`}
        </div>
      )}

      <SessionDetailsDrawer
        session={drawerSession}
        companyLabel={drawerCompany}
        open={drawerSession != null}
        onClose={() => setDrawerSession(null)}
      />
    </div>
  );
}
