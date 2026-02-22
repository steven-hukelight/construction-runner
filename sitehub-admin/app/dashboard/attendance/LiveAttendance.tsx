"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
function getRelativeTime(date: Date) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff} sec ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return date.toLocaleString();
}
import { useCompanyName } from "@/lib/hooks/useCompanyName";

type AttendanceLog = {
  id: string;
  timestamp?: { toDate?: () => Date } | string | Date;
  name?: string;
  displayName?: string;
  userName?: string;
  operativeName?: string;
  operativeId?: string;
  userId?: string;
  uid?: string;
  companyId?: string;
  siteName?: string;
  siteId?: string;
  site?: { id?: string; name?: string } | any;
  action?: string;
  notes?: string;
};

function CompanyNameCell({ companyId }: { companyId: string }) {
  const name = useCompanyName(companyId);
  return <>{name ?? "—"}</>;
}

export default function LiveAttendance({ refreshTrigger = 0 }: { refreshTrigger?: number }) {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  useEffect(() => {
    const params = new URLSearchParams({ limit: "500" });
    if (selectedSiteId !== "all") params.set("siteId", selectedSiteId);
    if (selectedUserId !== "all") params.set("userId", selectedUserId);

    const fetchFromApi = async () => {
      try {
        const res = await fetch(`/api/attendance?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json();
        setLogs(Array.isArray(json) ? json : []);
      } catch {
        setLogs([]);
      }
    };

    fetchFromApi();
    const interval = setInterval(fetchFromApi, 15000); // Poll every 15s for live updates
    return () => clearInterval(interval);
  }, [refreshTrigger, selectedSiteId, selectedUserId]);

  // Load users/sites/profiles via API (access control via company_id cookie)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [usersRes, sitesRes, profilesRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store", credentials: "include" }),
          fetch("/api/sites", { cache: "no-store", credentials: "include" }),
          fetch("/api/profiles", { cache: "no-store", credentials: "include" }),
        ]);
        if (!cancelled) {
          const [usersJson, sitesJson, profilesJson] = await Promise.all([
            usersRes.json(),
            sitesRes.json(),
            profilesRes.json(),
          ]);
          setUsers(Array.isArray(usersJson) ? usersJson : []);
          setSites(Array.isArray(sitesJson) ? sitesJson : []);
          setProfiles(Array.isArray(profilesJson) ? profilesJson : []);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setSites([]);
          setProfiles([]);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const userMap = useMemo(() => {
    const m = new Map<string, any>();
    users.forEach((u: any) => m.set(u.id, u));
    return m;
  }, [users]);

  const siteMap = useMemo(() => {
    const m = new Map<string, any>();
    sites.forEach((s: any) => m.set(s.id, s));
    return m;
  }, [sites]);

  const profileByUserId = useMemo(() => {
    const m = new Map<string, any>();
    profiles.forEach((p: any) => {
      const uid = p.id ?? p.userId;
      if (uid) m.set(String(uid), p);
    });
    return m;
  }, [profiles]);

  // Force re-render every minute for live relative time
  useEffect(() => {
    const interval = setInterval(() => {
      // This will trigger a re-render
      setLogs((logs) => [...logs]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 mb-4">
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
                {u.display_name || u.name || (u.email ? String(u.email).split("@")[0] : u.id)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="table w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide">
              <th>Time</th>
              <th>Operative</th>
              <th>Company</th>
              <th>Site</th>
              <th>Action</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50 transition">
                <td className="text-sm">
                  {(() => {
                    const t: any = l.timestamp;
                    let d: Date | null = null;
                    if (t?.toDate) d = t.toDate();
                    else if (t instanceof Date) d = t;
                    else if (typeof t === "string" || typeof t === "number") {
                      const parsed = new Date(t);
                      if (!isNaN(parsed.getTime())) d = parsed;
                    }
                    if (d) return getRelativeTime(d);
                    return t?.toString() ?? "";
                  })()}
                </td>
                <td>
                  {(() => {
                    // Prefer real names first, then IDs, then email local-part
                    const directPreferred = [l.name, l.displayName, l.operativeName];
                    const direct = directPreferred.find((n) => n && String(n).trim());
                    if (direct) return String(direct);
                    const idHints = [l.operativeId, l.userId, l.uid, (l as { user_id?: string }).user_id];
                    const id = idHints.find((x) => x && String(x).trim());
                    if (id) {
                      // Prefer profile displayName via userId mapping
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
                <td className="text-sm text-gray-600">
                  {l.companyId || (l as { company_id?: string }).company_id ? (
                    <CompanyNameCell companyId={String(l.companyId || (l as { company_id?: string }).company_id)} />
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {(() => {
                    const siteNameHints = [l.siteName, l.site?.name];
                    const siteIdHints = [l.siteId, (l as { site_id?: string }).site_id, l.site?.id];
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
                <td>{l.action}</td>
                <td className="text-sm text-slate-500">{l.notes || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && (
        <div className="text-sm text-slate-400">No attendance events yet.</div>
      )}
    </div>
  );
}
