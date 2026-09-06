"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
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
  let dt: Date;
  if (typeof value === "string" || typeof value === "number") {
    dt = new Date(value);
    if (isNaN(dt.getTime())) return String(value);
  } else if (value instanceof Date) {
    dt = value;
  } else if (typeof value === "object" && value.toDate && typeof value.toDate === "function") {
    try {
      dt = value.toDate();
    } catch {
      return "";
    }
  } else {
    return "";
  }
  return formatDateTime(dt);
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

export default function RoleCall({
  selectedDate: selectedDateProp,
  onArchived,
}: { selectedDate?: string; onArchived?: () => void }) {
  const [people, setPeople] = useState<PersonStatus[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string | "all">("all");
  const [localDate, setLocalDate] = useState<string>(() => todayStr());
  const selectedDate = selectedDateProp ?? localDate;
  const [archiving, setArchiving] = useState(false);
  const [statusTab, setStatusTab] = useState<"signed_in" | "signed_out">("signed_in");
  const isToday = selectedDate === todayStr();

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

  const signedInPeople = useMemo(
    () => people.filter((p) => p.lastActionNormalized === "sign_in"),
    [people]
  );
  const signedOutPeople = useMemo(
    () => people.filter((p) => p.lastActionNormalized === "sign_out"),
    [people]
  );
  const displayedPeople = statusTab === "signed_in" ? signedInPeople : signedOutPeople;

  // Load attendance from API (today = live; past days = archive)
  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: "500" });
        if (selectedSiteId !== "all") params.set("siteId", selectedSiteId);
        let res: Response;
        if (isToday) {
          // Latest live row per person (including leftover open sessions until midnight archive).
          res = await fetch(`/api/attendance?${params}`, {
            cache: "no-store",
            credentials: "include",
          });
        } else {
          params.set("date", selectedDate);
          res = await fetch(`/api/attendance/archive?${params}`, {
            cache: "no-store",
            credentials: "include",
          });
        }
        const json = await res.json();
        setAttendanceLogs(Array.isArray(json) ? (json as AttendanceLog[]) : []);
      } catch {
        setAttendanceLogs([]);
      }
    };
    load();
    const interval = isToday ? setInterval(load, 30000) : undefined;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, selectedSiteId, isToday]);

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
    if (!displayedPeople.length) return;

    const header = "Name,Last Action,Last Time\n";
    const rows = displayedPeople
      .map((p) => {
        const safeName = (p.name || "").replace(/"/g, '""');
        return `"${safeName}",${p.lastActionNormalized === "sign_in" ? "SIGN IN" : "SIGN OUT"},${p.lastTime}`;
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
      `role-call-${statusTab === "signed_in" ? "signed-in" : "signed-out"}-${selectedDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!displayedPeople.length) return;

    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(statusTab === "signed_in" ? "Role Call — Signed in" : "Role Call — Signed out", 14, 16);
    doc.setFontSize(10);

    let y = 26;
    const lineHeight = 7;

    displayedPeople.forEach((p, index) => {
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

    doc.save(`role-call-${statusTab === "signed_in" ? "signed-in" : "signed-out"}-${selectedDate}.pdf`);
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
        setLocalDate(todayStr());
        setPeople([]);
        setAttendanceLogs([]);
        onArchived?.();
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
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Role Call</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Fire roll call — signed-in operatives first; signed-out on the other tab.
            </p>
          </div>
          {selectedDateProp == null && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Date</label>
              <input
                type="date"
                className="input text-xs"
                value={selectedDate}
                onChange={(e) => setLocalDate(e.target.value || todayStr())}
              />
            </div>
          )}
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
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Date: {selectedDate}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">Site: {selectedSiteName}</span>
            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
              {displayedPeople.length} {displayedPeople.length === 1 ? "person" : "people"}
            </span>
            <Button variant="secondary" size="sm" type="button" onClick={handleExportCSV} disabled={!displayedPeople.length}>Export CSV</Button>
            <Button size="sm" type="button" onClick={handleExportPDF} disabled={!displayedPeople.length}>Export PDF</Button>
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

      <div className="bg-slate-100/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-600 rounded-xl p-1 inline-flex gap-1">
        <button
          type="button"
          onClick={() => setStatusTab("signed_in")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === "signed_in"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          Signed in ({signedInPeople.length})
        </button>
        <button
          type="button"
          onClick={() => setStatusTab("signed_out")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            statusTab === "signed_out"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
          }`}
        >
          Signed out ({signedOutPeople.length})
        </button>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isToday ? "No attendance activity yet." : `No archived attendance for ${selectedDate}.`}
        </p>
      ) : displayedPeople.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {statusTab === "signed_in"
            ? "No one is signed in."
            : "No one has signed out yet."}
        </p>
      ) : (
        <Table columns={columns} data={displayedPeople} />
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
