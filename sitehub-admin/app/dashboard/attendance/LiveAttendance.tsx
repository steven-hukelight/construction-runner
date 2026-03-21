"use client";

import { useEffect, useMemo, useState } from "react";
import { useTableDensityClasses } from "@/app/DisplayPreferencesProvider";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getRelativeTime(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return date.toLocaleString();
}

type TimestampLike = { toDate?: () => Date } | string | number | Date;
type AttendanceLog = {
  id: string;
  timestamp?: TimestampLike;
  name?: string;
  displayName?: string;
  userName?: string;
  operativeName?: string;
  operativeId?: string;
  userId?: string;
  user_id?: string;
  uid?: string;
  companyId?: string;
  company_id?: string;
  siteName?: string;
  siteId?: string;
  site_id?: string;
  site?: { id?: string; name?: string } | null;
  action?: string;
  notes?: string;
};

type User = { id: string; name?: string; display_name?: string; email?: string; displayName?: string };
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

const parseTimestamp = (value: TimestampLike | undefined): Date | null => {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value instanceof Date) return value;
  if (typeof value === "object" && value.toDate && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  return null;
};


export default function LiveAttendance({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr());

  const isToday = selectedDate === todayStr();

  const displayedLogs = useMemo(() => {
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

  useEffect(() => {
    const fetchFromApi = async () => {
      try {
        let json: AttendanceLog[] = [];
        if (isToday) {
          const params = new URLSearchParams({ limit: "500", date: selectedDate });
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
    return () => { if (interval) clearInterval(interval); };
  }, [refreshTrigger, selectedDate, selectedSiteId, selectedUserId, isToday]);

  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});

  // Load users/sites/profiles/companies via API (companyMap avoids per-row fetches)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersRes, sitesRes, profilesRes, companiesRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store", credentials: "include" }),
          fetch("/api/sites", { cache: "no-store", credentials: "include" }),
          fetch("/api/profiles", { cache: "no-store", credentials: "include" }),
          fetch("/api/companies", { cache: "no-store", credentials: "include" }),
        ]);
        if (!cancelled) {
          const [usersJson, sitesJson, profilesJson, companiesJson] = await Promise.all([
            usersRes.json(),
            sitesRes.json(),
            profilesRes.json(),
            companiesRes.json(),
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

  // Re-render every minute to update relative time ("5 min ago" -> "6 min ago") without mutating logs
  const [, setTimeTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const formatTime = (d: Date | null) => {
    if (!d) return "";
    return isToday ? getRelativeTime(d) : d.toLocaleString("en-GB");
  };

  const density = useTableDensityClasses();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Date</label>
          <input
            type="date"
            className="input text-sm py-1.5"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || todayStr())}
          />
        </div>
        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDate(todayStr())}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Today
          </button>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Site</label>
          <select
            className="input text-sm py-1.5"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
          >
            <option value="all">All sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name || s.id}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600">User</label>
          <select
            className="input text-sm py-1.5"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="all">All users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name || u.displayName || u.name || (u.email ? String(u.email).split("@")[0] : u.id)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-auto">
        <table className={`table w-full ${density.table}`}>
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide">
              <th className={density.th}>Time</th>
              <th className={density.th}>Operative</th>
              <th className={density.th}>Company</th>
              <th className={density.th}>Site</th>
              <th className={density.th}>Action</th>
              <th className={density.th}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {displayedLogs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 transition">
                <td className={density.td}>
                  {(formatTime(parseTimestamp(l.timestamp)) || l.timestamp?.toString()) ?? ""}
                </td>
                <td className={density.td}>
                  {(() => {
                    const directPreferred = [l.name, l.displayName, l.operativeName];
                    const direct = directPreferred.find((n) => n && String(n).trim());
                    if (direct) return String(direct);
                    const idHints = [l.operativeId, l.userId, l.uid, l.user_id];
                    const id = idHints.find((x) => x && String(x).trim());
                    if (id) {
                      const p = profileByUserId.get(String(id));
                      if (p?.displayName) return String(p.displayName);
                      const u = userMap.get(String(id));
                      if (u?.name) return String(u.name);
                      if (u?.email) return String(u.email).split("@")[0];
                      return "—";
                    }
                    if (l.userName && String(l.userName).trim()) return String(l.userName);
                    return "—";
                  })()}
                </td>
                <td className={`${density.td} text-gray-600`}>
                  {l.companyId || l.company_id
                    ? (companyMap[String(l.companyId || l.company_id)] ?? "—")
                    : "—"}
                </td>
                <td className={density.td}>
                  {(() => {
                    const siteNameHints = [l.siteName, l.site?.name];
                    const siteIdHints = [l.siteId, l.site_id, l.site?.id];
                    const sname = siteNameHints.find((n) => n && String(n).trim());
                    if (sname) return String(sname);
                    const sid = siteIdHints.find((x) => x && String(x).trim());
                    if (sid) {
                      const s = siteMap.get(String(sid));
                      if (s?.name) return String(s.name);
                      return "—";
                    }
                    return "—";
                  })()}
                </td>
                <td className={density.td}>{l.action}</td>
                <td className={`${density.td} text-slate-500`}>{l.notes || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {displayedLogs.length === 0 && (
        <div className="text-sm text-slate-400">
          {isToday ? "No attendance events yet." : `No attendance events for ${selectedDate}.`}
        </div>
      )}
    </div>
  );
}
