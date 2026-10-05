"use client";
import toast from "react-hot-toast";

import { useEffect, useMemo, useState } from "react";
import { formatDate, formatDateTime, formatTime } from "@/app/DisplayPreferencesProvider";
import { UserRound } from "lucide-react";
import Button from "../components/ui/Button";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import { SitePicker } from "../components/ui/SitePicker";
import { localCalendarDayToUtcIsoBounds } from "@/lib/attendanceLocalDayWindow";
import { leftSiteAutoSignOutReasonSuffix } from "./live/sessionNotesFormat";

type TimestampLike = { toDate?: () => Date } | string | number | Date;
type AttendanceLog = {
  id: string;
  timestamp?: TimestampLike;
  name?: string;
  displayName?: string;
  display_name?: string;
  operativeName?: string;
  userId?: string;
  user_id?: string;
  operativeId?: string;
  email?: string;
  siteName?: string;
  siteId?: string;
  site_id?: string;
  action?: string;
  exit_time?: TimestampLike;
  exitTime?: TimestampLike;
  sign_out_time?: TimestampLike;
  signOutTime?: TimestampLike;
  auto_sign_out_reason?: string;
  autoSignOutReason?: string;
};

type PersonStatus = {
  id: string;
  name: string;
  lastAction: string;
  lastActionNormalized: "sign_in" | "sign_out";
  lastTime: string;
  signedInTime: string;
  leftSiteTime: string;
  signedOutTime: string;
  autoSignOutReason: string;
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
  const display =
    asString(obj.display_name) ||
    asString(obj.displayName) ||
    (asString(obj.name) && !String(obj.name).includes("@") ? asString(obj.name) : undefined);
  return {
    id: asString(obj.id ?? obj.userId ?? obj.user_id),
    userId: asString(obj.userId ?? obj.user_id ?? obj.id),
    name: display || asString(obj.name),
    displayName: display,
    display_name: display,
    email: asString(obj.email),
  };
};

const normalizeProfile = (value: unknown): Profile => {
  if (!value || typeof value !== "object") return {};
  const obj = value as Record<string, unknown>;
  const display =
    asString(obj.display_name) ||
    asString(obj.displayName) ||
    (asString(obj.name) && !String(obj.name).includes("@") ? asString(obj.name) : undefined);
  return {
    id: asString(obj.id ?? obj.userId ?? obj.user_id),
    userId: asString(obj.userId ?? obj.user_id ?? obj.id),
    displayName: display,
    display_name: display,
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

function formatTimeOrEmpty(value: TimestampLike | undefined): string {
  if (!value) return "";
  let dt: Date;
  if (typeof value === "string" || typeof value === "number") {
    dt = new Date(value);
    if (isNaN(dt.getTime())) return "";
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
  const s = formatTime(dt);
  return s === "—" ? "" : s;
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

      const signedInTime = formatTimeOrEmpty(data.timestamp);
      const leftSiteTime = formatTimeOrEmpty(data.exitTime ?? data.exit_time);
      const signedOutTime = formatTimeOrEmpty(
        data.signOutTime ?? data.sign_out_time ?? (actionNorm === "sign_out" ? data.timestamp : undefined)
      );
      const autoSignOutReason = String(data.autoSignOutReason ?? data.auto_sign_out_reason ?? "").trim();
      const reasonSuffix = leftSiteAutoSignOutReasonSuffix(autoSignOutReason);
      const lastTime =
        actionNorm === "sign_in"
          ? (signedInTime ? `Signed in: ${signedInTime}` : formatTimestamp(data.timestamp))
          : [
              leftSiteTime && `Left site: ${leftSiteTime}${reasonSuffix}`,
              signedOutTime && `Signed out: ${signedOutTime}`,
            ]
              .filter(Boolean)
              .join(" | ") || formatTimestamp(data.timestamp);

      seen.set(key, {
        id: key,
        name: resolvedName,
        lastAction: actionRaw,
        lastActionNormalized: actionNorm,
        lastTime,
        signedInTime,
        leftSiteTime,
        signedOutTime,
        autoSignOutReason,
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
          const bounds = localCalendarDayToUtcIsoBounds(selectedDate);
          if (bounds) {
            params.set("windowStart", bounds.start);
            params.set("windowEnd", bounds.end);
          }
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
        const times =
          p.lastActionNormalized === "sign_in"
            ? p.signedInTime
              ? `Signed in: ${p.signedInTime}`
              : p.lastTime
            : [
                p.leftSiteTime &&
                  `Left site: ${p.leftSiteTime}${leftSiteAutoSignOutReasonSuffix(p.autoSignOutReason)}`,
                p.signedOutTime && `Signed out: ${p.signedOutTime}`,
              ]
                .filter(Boolean)
                .join(" | ") || p.lastTime;
        return `"${safeName}",${p.lastActionNormalized === "sign_in" ? "Signed in" : "Signed out"},${times}`;
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

    const [{ createReportPdf }, branding] = await Promise.all([
      import("@/lib/pdf/createReportPdf"),
      import("@/lib/pdf/fetchPdfBrandingClient").then((m) =>
        m.fetchPdfBrandingClient(),
      ),
    ]);

    const report = createReportPdf({
      title:
        statusTab === "signed_in"
          ? "Role call — Signed in"
          : "Role call — Signed out",
      subtitle: `Date: ${selectedDate}`,
      metaLines: [`${displayedPeople.length} people`],
      branding,
      footerLabel: "Construction Runner — role call",
    });

    const { doc, margin } = report;
    displayedPeople.forEach((p, index) => {
      report.ensureSpace(8);
      const y = report.y;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(28, 32, 38);
      doc.text(`${index + 1}.  ${p.name}`, margin, y);
      doc.setFontSize(8.5);
      doc.setTextColor(100, 110, 124);
      const status =
        p.lastActionNormalized === "sign_in" ? "Signed in" : "Signed out";
      doc.text(`${status}  ·  ${p.lastTime}`, margin + 6, y + 4.5);
      doc.setTextColor(28, 32, 38);
      report.setY(y + 10);
    });

    report.applyFooters();
    doc.save(
      `role-call-${statusTab === "signed_in" ? "signed-in" : "signed-out"}-${selectedDate}.pdf`,
    );
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
        toast.success(`Role call for ${selectedDate} archived. Ready for next session.`);
      } else {
        toast.error(data?.error ?? "Failed to archive");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error(e);
      toast.error(`Failed to archive role call: ${msg}`);
    } finally {
      setArchiving(false);
    }
  };

  const columns = [
    {
      header: "Name",
      accessor: "name",
      render: (row: PersonStatus) => <TableNameCell icon={UserRound} label={row.name} />,
    },
    {
      header: "Last Action",
      accessor: "lastAction",
      render: (row: PersonStatus) => {
        const isIn = row.lastActionNormalized === "sign_in";
        return (
          <span className={`status-chip ${isIn ? "status-chip--ok" : "status-chip--muted"}`}>
            {isIn ? "Signed in" : "Signed out"}
          </span>
        );
      },
    },
    {
      header: "Times",
      accessor: "lastTime",
      render: (row: PersonStatus) => {
        if (row.lastActionNormalized === "sign_in") {
          return (
            <span className="tabular-nums text-sm text-slate-800 dark:text-slate-200">
              {row.signedInTime ? `Signed in: ${row.signedInTime}` : row.lastTime || "—"}
            </span>
          );
        }
        const reasonSuffix = leftSiteAutoSignOutReasonSuffix(row.autoSignOutReason);
        return (
          <div className="tabular-nums text-sm text-slate-800 dark:text-slate-200 space-y-0.5">
            {row.leftSiteTime ? <div>Left site: {row.leftSiteTime}{reasonSuffix}</div> : null}
            {row.signedOutTime ? <div>Signed out: {row.signedOutTime}</div> : null}
            {!row.leftSiteTime && !row.signedOutTime ? <div>{row.lastTime || "—"}</div> : null}
          </div>
        );
      },
    },
  ];

  return (
    <Table
      title="Role call"
      subtitle="Fire roll call — signed-in operatives first; signed-out on the other tab."
      actions={
        people.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={handleExportCSV} disabled={!displayedPeople.length}>
              Export CSV
            </Button>
            <Button size="sm" type="button" onClick={handleExportPDF} disabled={!displayedPeople.length}>
              Export PDF
            </Button>
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
        ) : null
      }
      extra={
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {selectedDateProp == null && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600">Date</label>
              <input
                type="date"
                className="table-toolbar-input text-xs"
                value={selectedDate}
                onChange={(e) => setLocalDate(e.target.value || todayStr())}
              />
            </div>
          )}
          <SitePicker
            sites={sites}
            value={selectedSiteId}
            onChange={(id) => setSelectedSiteId(id as string | "all")}
            variant="compact"
            allowNone
            noneValue="all"
            noneLabel="All sites"
            placeholder="All sites"
            className="w-52"
          />
          {people.length > 0 && (
            <>
              <span className="status-chip status-chip--muted">Date: {formatDate(new Date(`${selectedDate}T12:00:00`))}</span>
              <span className="status-chip status-chip--muted">Site: {selectedSiteName}</span>
              <span className="status-chip status-chip--info">
                {displayedPeople.length} {displayedPeople.length === 1 ? "person" : "people"}
              </span>
            </>
          )}
          <div className="inline-flex gap-1 rounded-xl border border-blue-100 bg-[#f7fafc] p-1">
            <button
              type="button"
              onClick={() => setStatusTab("signed_in")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-[120ms] ${
                statusTab === "signed_in"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              Signed in ({signedInPeople.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("signed_out")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-[120ms] ${
                statusTab === "signed_out"
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              }`}
            >
              Signed out ({signedOutPeople.length})
            </button>
          </div>
        </div>
      }
      columns={columns}
      data={displayedPeople}
      emptyMessage={
        people.length === 0
          ? isToday
            ? "No attendance activity yet."
            : `No archived attendance for ${selectedDate}.`
          : statusTab === "signed_in"
            ? "No one is signed in."
            : "No one has signed out yet."
      }
    />
  );
}

function resolveName(uid: string, data: AttendanceLog, users: User[], profiles: Profile[]): string {
  const looksLikeEmail = (s: string) => s.includes("@");
  /** Prefer real names; treat email-local-part fallbacks as last resort. */
  const pick = (...vals: unknown[]): string | null => {
    for (const v of vals) {
      const s = String(v ?? "").trim();
      if (s && !looksLikeEmail(s)) return s;
    }
    return null;
  };

  const trimmedUid = String(uid || "").trim();
  const u = trimmedUid
    ? users.find((x) => String(x.id ?? x.userId ?? "") === trimmedUid)
    : undefined;
  const p = trimmedUid
    ? profiles.find((x) => String(x.id ?? x.userId ?? "") === trimmedUid)
    : undefined;

  // Directory display_name first (never email-prefix aliases from profiles.displayName).
  const fromDirectory = pick(
    u?.display_name,
    u?.displayName,
    p?.display_name,
    p?.displayName,
    u?.name,
    data.display_name,
    data.displayName,
    data.operativeName,
    data.name,
  );
  if (fromDirectory) return fromDirectory;

  const email = String(u?.email ?? data.email ?? "").trim();
  if (email.includes("@")) return email.split("@")[0] || email;
  if (data.operativeId && String(data.operativeId).trim()) return String(data.operativeId);
  return "Unknown";
}
