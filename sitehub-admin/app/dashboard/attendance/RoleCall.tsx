"use client";

import { useEffect, useState } from "react";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";

type TimestampLike = { toDate?: () => Date } | string | number | Date;
type AttendanceLog = {
  id: string;
  timestamp?: TimestampLike;
  name?: string;
  displayName?: string;
  operativeName?: string;
  userId?: string;
  user_id?: string;
  operativeId?: string;
  email?: string;
  siteName?: string;
  siteId?: string;
  site_id?: string;
  action?: string;
};

type PersonStatus = {
  id: string;
  name: string;
  lastAction: string;
  lastActionNormalized: "sign_in" | "sign_out";
  lastTime: string;
};

type User = { id?: string; userId?: string; name?: string; displayName?: string; display_name?: string; email?: string };
type Profile = { id?: string; userId?: string; displayName?: string; display_name?: string; email?: string };
type Site = { id?: string; name?: string };

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const asString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return undefined;
};

const normalizeUser = (value: unknown): User => {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  return {
    id: asString(obj.id ?? obj.userId),
    userId: asString(obj.userId),
    name: asString(obj.name),
    displayName: asString(obj.displayName ?? obj.display_name),
    display_name: asString(obj.display_name),
    email: asString(obj.email),
  };
};

const normalizeProfile = (value: unknown): Profile => {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  return {
    id: asString(obj.id ?? obj.userId),
    userId: asString(obj.userId),
    displayName: asString(obj.displayName ?? obj.display_name),
    display_name: asString(obj.display_name),
    email: asString(obj.email),
  };
};

const normalizeSite = (value: unknown): Site => {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  return {
    id: asString(obj.id),
    name: asString(obj.name),
  };
};

function formatTimestamp(value: TimestampLike | undefined): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? String(value) : dt.toLocaleString("en-GB");
  }
  if (value instanceof Date) return value.toLocaleString("en-GB");
  if (typeof value === "object" && value.toDate && typeof value.toDate === "function") {
    try {
      return value.toDate().toLocaleString("en-GB");
    } catch {
      return "";
    }
  }
  return "";
}

function normalizeAction(a: string): "sign_in" | "sign_out" {
  const s = a.toLowerCase().trim();
  if (
    s === "in" ||
    s === "sign in" ||
    s === "signin" ||
    s === "sign_in" ||
    s === "entered" ||
    s === "checkin" ||
    s === "check-in"
  ) {
    return "sign_in";
  }
  return "sign_out";
}

export default function RoleCall() {
  const [people, setPeople] = useState<PersonStatus[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>(() => todayStr());
  const [archiving, setArchiving] = useState(false);

  const selectedSiteName = (() => {
    if (selectedSiteId === "all") return "All sites";
    const s = sites.find((x) => String(x.id) === String(selectedSiteId));
    return s?.name || selectedSiteId;
  })();

  // Process attendance logs into people list (re-runs when logs, users, profiles, or site filter change)
  useEffect(() => {
    const filtered =
      selectedSiteId === "all"
        ? attendanceLogs
        : attendanceLogs.filter((l) => String(l.siteId ?? l.site_id ?? "") === String(selectedSiteId));

    const seen = new Map<string, PersonStatus>();
    filtered.forEach((data) => {
      const uid = String(data.userId ?? data.operativeId ?? data.user_id ?? "").trim();
      const key = uid || String(data.name ?? data.id ?? "").trim();
      if (!key || seen.has(key)) return;

      const actionRaw = String(data.action ?? "").trim();
      const actionNorm = normalizeAction(actionRaw);
      const resolvedName = resolveName(uid, data, users, profiles);

      seen.set(key, {
        id: key,
        name: resolvedName,
        lastAction: actionRaw,
        lastActionNormalized: actionNorm,
        lastTime: formatTimestamp(data.timestamp),
      });
    });

    setPeople(Array.from(seen.values()));
  }, [attendanceLogs, selectedSiteId, users, profiles]);

  // Load attendance from API (filtered by date for fire role call)
  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: "500", date: selectedDate });
        if (selectedSiteId !== "all") params.set("siteId", selectedSiteId);
        const res = await fetch(`/api/attendance?${params}`, {
          cache: "no-store",
          credentials: "include",
        });
        const json = await res.json();
        setAttendanceLogs(Array.isArray(json) ? (json as AttendanceLog[]) : []);
      } catch {
        setAttendanceLogs([]);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [selectedDate, selectedSiteId]);

  // Load users/profiles/sites from API
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
          setUsers(Array.isArray(usersJson) ? usersJson.map(normalizeUser) : []);
          setSites(Array.isArray(sitesJson) ? sitesJson.map(normalizeSite) : []);
          setProfiles(Array.isArray(profilesJson) ? profilesJson.map(normalizeProfile) : []);
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

  const handleExportCSV = () => {
    if (!people.length) return;

    const header = "Name,Last Action,Last Time\n";
    const rows = people
      .map((p) => {
        const safeName = (p.name || "").replace(/"/g, '""');
        return `"${safeName}",${p.lastAction},${p.lastTime}`;
      })
      .join("\n");

    const blob = new Blob([header + rows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `role-call-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!people.length) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Role Call", 14, 16);
    doc.setFontSize(10);

    let y = 26;
    const lineHeight = 7;

    people.forEach((p, index) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(
        `${index + 1}. ${p.name}  •  ${p.lastAction}  •  ${p.lastTime}`,
        14,
        y
      );
      y += lineHeight;
    });

    doc.save(`role-call-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleArchiveAndClear = async () => {
    setArchiving(true);
    try {
      const res = await fetch("/api/attendance/role-call-archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          snapshot: people,
          date: selectedDate,
          siteId: selectedSiteId === "all" ? null : selectedSiteId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedDate(todayStr());
        setPeople([]);
        setAttendanceLogs([]);
        alert(`Role call for ${selectedDate} archived. Ready for next session.`);
      } else {
        alert(data?.error ?? "Failed to archive");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(e);
      alert(`Failed to archive role call: ${msg}`);
    } finally {
      setArchiving(false);
    }
  };

  const columns = [
    {
      header: "Name",
      accessor: "name",
      render: (row: PersonStatus) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-medium">
            {row.name?.[0]?.toUpperCase() || "?"}
          </div>
          <span className="text-sm font-medium text-slate-900">{row.name}</span>
        </div>
      ),
    },
    {
      header: "Last Action",
      accessor: "lastAction",
      render: (row: PersonStatus) => {
        const isIn = row.lastActionNormalized === "sign_in";
        return (
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              isIn
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {isIn ? "SIGN IN" : "SIGN OUT"}
          </span>
        );
      },
    },
    {
      header: "Last Time",
      accessor: "lastTime",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Role Call</h3>
            <p className="text-xs text-slate-500">Fire roll call — daily sign-in status per operative.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Date</label>
            <input
              type="date"
              className="input text-xs"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value || todayStr())}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-600">Site</label>
            <select
              className="input text-xs"
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value as string | "all")}
            >
              <option value="all">All sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name || s.id}</option>
              ))}
            </select>
          </div>
        </div>
        {people.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700">Date: {selectedDate}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700">Site: {selectedSiteName}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700">{people.length} {people.length === 1 ? "person" : "people"}</span>
            <Button variant="secondary" size="sm" type="button" onClick={handleExportCSV}>Export CSV</Button>
            <Button size="sm" type="button" onClick={handleExportPDF}>Export PDF</Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={handleArchiveAndClear}
              disabled={archiving}
              className="text-amber-700 hover:bg-amber-50"
            >
              {archiving ? "Archiving…" : "Archive & Clear Day"}
            </Button>
          </div>
        )}
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-slate-500">No attendance activity yet.</p>
      ) : (
        <Table columns={columns} data={people} />
      )}
    </div>
  );
}

function resolveName(uid: string, data: AttendanceLog, users: User[], profiles: Profile[]): string {
  const trimmedUid = String(uid || "").trim();
  if (trimmedUid) {
    const p = profiles.find((x) => String(x.id ?? x.userId ?? "") === trimmedUid);
    if (p?.displayName && String(p.displayName).trim()) return String(p.displayName);
    const u = users.find((x) => String(x.id ?? x.userId ?? "") === trimmedUid);
    if (u?.name && String(u.name).trim()) return String(u.name);
    if (u?.email && String(u.email).includes("@")) return String(u.email).split("@")[0];
  }
  // Fall back to API-enriched or stamped values
  if (data.name && String(data.name).trim()) return String(data.name);
  if (data.displayName && String(data.displayName).trim()) return String(data.displayName);
  if (data.operativeName && String(data.operativeName).trim()) return String(data.operativeName);
  if (data.email && String(data.email).includes("@")) return String(data.email).split("@")[0];
  if (data.operativeId && String(data.operativeId).trim()) return String(data.operativeId);
  return "Unknown";
}
