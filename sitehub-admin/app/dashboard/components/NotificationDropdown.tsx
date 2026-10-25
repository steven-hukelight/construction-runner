"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { Bell, AlertCircle, UserPlus, MessageSquare, FileText, Megaphone, Package, Clock } from "lucide-react";
import Link from "next/link";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";

type NotificationItem =
  | { type: "attendance"; id: string; title: string; href: string; createdAt?: string; read: boolean }
  | { type: "near_miss"; id: string; title: string; href: string; createdAt?: string }
  | { type: "registration"; id: string; title: string; href: string; createdAt?: string }
  | { type: "message"; id: string; title: string; href: string; createdAt?: string }
  | { type: "rams"; id: string; title: string; href: string; createdAt?: string }
  | { type: "briefing"; id: string; title: string; href: string; createdAt?: string }
  | { type: "delivery"; id: string; title: string; href: string; createdAt?: string };

// Fetch the heavy fan-out only when the bell is opened (and at most every
// NOTIFICATION_REFRESH_MS while open). Previously this ran on every page after
// 1.5s and competed with the dashboard's own data loads.
const NOTIFICATION_REFRESH_MS = 120_000;
/** Show dashboard bell items from the last 7 days (RAMS, briefings, etc.). */
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
const SEEN_KEY = "sitehub_notif_seen";
const ATTENDANCE_ALERT_ROLES = new Set(["admin", "site_admin", "supervisor"]);
const ATTENDANCE_FEED = "/api/me/notifications?topic=attendance_alerts";

type InAppNotification = {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  createdAt: string;
  readAt: string | null;
};

function localYmd(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function attendanceHref(data: Record<string, unknown>): string {
  const params = new URLSearchParams();
  if (typeof data.site_id === "string" && data.site_id) params.set("siteId", data.site_id);
  const date = localYmd(data.occurred_at);
  if (date) params.set("date", date);
  const qs = params.toString();
  return qs ? `/dashboard/attendance?${qs}` : "/dashboard/attendance";
}

function isAttendanceAlertRole(role: string | null | undefined): boolean {
  return ATTENDANCE_ALERT_ROLES.has((role ?? "").toLowerCase());
}

function markAttendanceRead(ids: string[]) {
  if (ids.length === 0) return;
  void fetch("/api/me/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ids: ids.slice(0, 100) }),
  }).catch(() => {});
}

function notificationItemTime(item: NotificationItem): number {
  if (!item.createdAt) return Date.now();
  const t = new Date(item.createdAt).getTime();
  return Number.isFinite(t) ? t : Date.now();
}

function getSeenSet(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markSeen(type: string, id: string) {
  if (typeof sessionStorage === "undefined") return;
  try {
    const seen = getSeenSet();
    seen.add(`${type}:${id}`);
    sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {}
}

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [seenKeys, setSeenKeys] = useState<Set<string>>(() => getSeenSet());
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayItems = useMemo(() => {
    return [...items].sort((a, b) => notificationItemTime(b) - notificationItemTime(a)).slice(0, 30);
  }, [items]);

  const unseenItems = useMemo(
    () =>
      displayItems.filter(
        (item) => !seenKeys.has(`${item.type}:${item.id}`) && !(item.type === "attendance" && item.read)
      ),
    [displayItems, seenKeys]
  );
  const [attendanceUnread, setAttendanceUnread] = useState(0);

  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(() => getCompanyIdFromClient());
  const lastFetchAtRef = useRef(0);
  const fetchInFlightRef = useRef(false);

  const fetchNotifications = useCallback(async (opts?: { force?: boolean }) => {
    const role = getRoleFromClient();
    if (!role) return;
    if (fetchInFlightRef.current) return;
    const now = Date.now();
    if (!opts?.force && lastFetchAtRef.current && now - lastFetchAtRef.current < NOTIFICATION_REFRESH_MS) {
      return;
    }

    const companyId = getCompanyIdFromClient();
    const ensureCompanyId = async () => {
      if (companyId) return companyId;
      if (resolvedCompanyId) return resolvedCompanyId;
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.ok) {
          const me = (await res.json()) as { companyId?: string; company_id?: string };
          const cid = me.companyId ?? me.company_id ?? null;
          if (cid) {
            setResolvedCompanyId(cid);
            return cid;
          }
        }
      } catch {}
      return null;
    };

    const qs = (base: string, cid: string | null) => {
      if (cid) return `${base}?companyId=${encodeURIComponent(cid)}`;
      return base;
    };
    const isAdminOrSupervisor = ["admin", "supervisor", "sub_admin", "superuser"].includes((role ?? "").toLowerCase());

    fetchInFlightRef.current = true;
    setLoading(true);
    try {
      const cid = companyId ?? resolvedCompanyId ?? (await ensureCompanyId());
      const dayAgo = Date.now() - RECENT_MS;
      const fetches: Promise<Response>[] = [
        cid ? fetch(`/api/messages/threads?companyId=${encodeURIComponent(cid)}`, { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
      ];
      if (isAdminOrSupervisor) {
        fetches.push(
          fetch(`${qs("/api/near-miss", cid)}${qs("/api/near-miss", cid).includes("?") ? "&" : "?"}unreviewed=true&limit=10`, { cache: "no-store", credentials: "include" }),
          fetch("/api/auth/registrations", { cache: "no-store", credentials: "include" }),
          cid ? fetch(`${qs("/api/rams", cid)}${qs("/api/rams", cid).includes("?") ? "&" : "?"}limit=20`, { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
          cid ? fetch(`${qs("/api/briefings", cid)}${qs("/api/briefings", cid).includes("?") ? "&" : "?"}limit=20`, { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
          cid ? fetch(qs("/api/deliveries", cid) + (qs("/api/deliveries", cid).includes("?") ? "&" : "?") + "limit=20", { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
        );
      } else {
        fetches.push(
          cid ? fetch(`${qs("/api/rams", cid)}${qs("/api/rams", cid).includes("?") ? "&" : "?"}limit=20`, { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
          cid ? fetch(`${qs("/api/briefings", cid)}${qs("/api/briefings", cid).includes("?") ? "&" : "?"}limit=20`, { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
          cid ? fetch(qs("/api/deliveries", cid) + (qs("/api/deliveries", cid).includes("?") ? "&" : "?") + "limit=20", { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
        );
      }

      const attendancePromise: Promise<{ notifications?: InAppNotification[]; unreadCount?: number } | null> =
        isAttendanceAlertRole(role)
          ? fetch(`${ATTENDANCE_FEED}&limit=20`, { cache: "no-store", credentials: "include" })
              .then((res) => (res.ok ? res.json() : null))
              .catch(() => null)
          : Promise.resolve(null);
      const [[threadsRes, ...rest], attendanceFeed] = await Promise.all([Promise.all(fetches), attendancePromise]);
      const nearMissRes = isAdminOrSupervisor ? rest[0] : null;
      const regsRes = isAdminOrSupervisor ? rest[1] : null;
      const ramsRes = isAdminOrSupervisor ? rest[2] : rest[0];
      const briefingsRes = isAdminOrSupervisor ? rest[3] : rest[1];
      const deliveriesRes = isAdminOrSupervisor ? rest[4] : rest[2];

      const threads = threadsRes.ok ? await threadsRes.json() : [];
      const nearMisses = nearMissRes?.ok ? await nearMissRes.json() : [];
      const regs = regsRes?.ok ? await regsRes.json() : [];
      const rams = ramsRes?.ok ? await ramsRes.json() : [];
      const briefings = briefingsRes?.ok ? await briefingsRes.json() : [];
      const deliveries = deliveriesRes?.ok ? await deliveriesRes.json() : [];

      const list: NotificationItem[] = [];

      if (attendanceFeed && Array.isArray(attendanceFeed.notifications)) {
        for (const n of attendanceFeed.notifications) {
          list.push({
            type: "attendance",
            id: n.id,
            title: n.body ? `${n.title} · ${n.body}` : n.title,
            href: attendanceHref(n.data ?? {}),
            createdAt: n.createdAt,
            read: n.readAt != null,
          });
        }
        setAttendanceUnread(typeof attendanceFeed.unreadCount === "number" ? attendanceFeed.unreadCount : 0);
      }

      if (Array.isArray(nearMisses)) {
        nearMisses.forEach((m: { id: string; description?: string; created_at?: string }) => {
          list.push({
            type: "near_miss",
            id: m.id,
            title: (m.description || "Near miss report").slice(0, 60) + ((m.description?.length ?? 0) > 60 ? "…" : ""),
            href: `/dashboard/health-and-safety/near-miss/${m.id}`,
            createdAt: m.created_at,
          });
        });
      }
      if (Array.isArray(regs)) {
        regs.slice(0, 5).forEach((r: { id: string; data?: { email?: string; name?: string }; email?: string }) => {
          const email = r.data?.email ?? r.email ?? "Unknown";
          list.push({
            type: "registration",
            id: r.id,
            title: `Registration pending: ${email}`,
            href: "/dashboard/users",
            createdAt: undefined,
          });
        });
      }
      if (Array.isArray(threads) && threads.length > 0) {
        threads
          .filter((t: { lastAt?: string; unread?: boolean; inThread?: boolean }) => {
            if (!t.lastAt || new Date(t.lastAt).getTime() <= dayAgo) return false;
            return t.unread === true || t.unread == null;
          })
          .slice(0, 5)
          .forEach((t: { id: string; lastMessage?: string; lastAt?: string }) => {
            const preview = (t.lastMessage || "New conversation").slice(0, 50) + ((t.lastMessage?.length ?? 0) > 50 ? "…" : "");
            list.push({
              type: "message",
              id: t.id,
              title: preview,
              href: `/dashboard/messages/${t.id}`,
              createdAt: t.lastAt,
            });
          });
      }
      if (Array.isArray(rams)) {
        rams
          .filter((r: { created_at?: string; createdAt?: string }) => {
            const ts = r.created_at ?? r.createdAt;
            if (!ts) return true;
            return new Date(ts).getTime() > dayAgo;
          })
          .slice(0, 15)
          .forEach((r: { id: string; title?: string; created_at?: string; createdAt?: string }) => {
            list.push({
              type: "rams",
              id: r.id,
              title: (r.title || "New RAMS").slice(0, 50),
              href: "/dashboard/health-and-safety/rams",
              createdAt: r.created_at ?? r.createdAt,
            });
          });
      }
      if (Array.isArray(briefings)) {
        briefings
          .filter((b: { created_at?: string; createdAt?: string }) => {
            const ts = b.created_at ?? b.createdAt;
            if (!ts) return true;
            return new Date(ts).getTime() > dayAgo;
          })
          .slice(0, 15)
          .forEach((b: { id: string; title?: string; created_at?: string; createdAt?: string }) => {
            list.push({
              type: "briefing",
              id: b.id,
              title: (b.title || "New briefing").slice(0, 50),
              href: "/dashboard/health-and-safety/briefings",
              createdAt: b.created_at ?? b.createdAt,
            });
          });
      }
      if (Array.isArray(deliveries)) {
        deliveries
          .filter((d: { created_at?: string; createdAt?: string }) => {
            const ts = d.created_at ?? d.createdAt;
            if (!ts) return true;
            return new Date(ts).getTime() > dayAgo;
          })
          .slice(0, 15)
          .forEach((d: { id: string; reference?: string; created_at?: string; createdAt?: string }) => {
            list.push({
              type: "delivery",
              id: d.id,
              title: `Delivery: ${(d.reference || "New").slice(0, 40)}`,
              href: "/dashboard/deliveries",
              createdAt: d.created_at ?? d.createdAt,
            });
          });
      }
      setItems(list);
      lastFetchAtRef.current = Date.now();
    } catch {
      setItems([]);
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [resolvedCompanyId]);

  // Load (and poll) only while the dropdown is open, never on every page load.
  useEffect(() => {
    if (!open) return;
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications({ force: true }), NOTIFICATION_REFRESH_MS);
    return () => clearInterval(interval);
  }, [open, fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [open]);

  // Cheap unread check so the dot shows new attendance alerts before the bell is opened.
  useEffect(() => {
    if (!isAttendanceAlertRole(getRoleFromClient())) return;
    let cancelled = false;
    const check = () => {
      if (document.visibilityState === "hidden") return;
      fetch(`${ATTENDANCE_FEED}&unread=1&limit=1`, { cache: "no-store", credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: { unreadCount?: number } | null) => {
          if (!cancelled && typeof data?.unreadCount === "number") setAttendanceUnread(data.unreadCount);
        })
        .catch(() => {});
    };
    check();
    const interval = setInterval(check, NOTIFICATION_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const hasNew = unseenItems.length > 0 || attendanceUnread > 0;

  const countsByType = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of unseenItems) {
      c[i.type] = (c[i.type] ?? 0) + 1;
    }
    return c;
  }, [unseenItems]);

  const unseenCount = unseenItems.length;

  const markItemsSeen = useCallback((list: NotificationItem[]) => {
    if (list.length === 0) return;
    const unreadAttendance = list.filter((i) => i.type === "attendance" && !i.read).map((i) => i.id);
    if (unreadAttendance.length > 0) {
      markAttendanceRead(unreadAttendance);
      setItems((prev) =>
        prev.map((i) => (i.type === "attendance" && unreadAttendance.includes(i.id) ? { ...i, read: true } : i))
      );
      setAttendanceUnread((n) => Math.max(0, n - unreadAttendance.length));
    }
    list.forEach((i) => markSeen(i.type, i.id));
    setSeenKeys((prev) => {
      const next = new Set(prev);
      list.forEach((i) => next.add(`${i.type}:${i.id}`));
      return next;
    });
  }, []);

  // Mark listed items as read when the panel closes (after the user has opened it).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      return;
    }
    if (!wasOpenRef.current || displayItems.length === 0) return;
    wasOpenRef.current = false;
    markItemsSeen(displayItems);
  }, [open, displayItems, markItemsSeen]);

  const handleNotificationClick = useCallback(
    (item: NotificationItem) => {
      markItemsSeen([item]);
      setOpen(false);
    },
    [markItemsSeen]
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-700/80 backdrop-blur-xl border border-gray-200/60 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 transition-colors duration-[120ms] relative group"
        title="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        {hasNew && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" aria-label="New notifications" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[400px] overflow-hidden rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl z-[9999]">
          <div className="p-3 border-b border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Notifications</h3>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {unseenCount > 0
                ? `${unseenCount} new · ` +
                  [
                    countsByType.attendance && `${countsByType.attendance} Attendance`,
                    countsByType.near_miss && `${countsByType.near_miss} Near miss`,
                    countsByType.registration && `${countsByType.registration} Registrations`,
                    countsByType.message && `${countsByType.message} Messages`,
                    countsByType.rams && `${countsByType.rams} RAMS`,
                    countsByType.briefing && `${countsByType.briefing} Briefings`,
                    countsByType.delivery && `${countsByType.delivery} Deliveries`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : `Last 7 days · ${displayItems.length} item${displayItems.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">Loading…</div>
            ) : displayItems.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">
                No activity in the last 7 days
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-600">
                {displayItems.map((item) => {
                  const isUnseen =
                    !seenKeys.has(`${item.type}:${item.id}`) && !(item.type === "attendance" && item.read);
                  return (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={item.href}
                      onClick={() => handleNotificationClick(item)}
                      className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <span className="shrink-0 mt-0.5">
                        {item.type === "attendance" ? (
                          <Clock className="w-4 h-4 text-blue-500" />
                        ) : item.type === "near_miss" ? (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        ) : item.type === "message" ? (
                          <MessageSquare className="w-4 h-4 text-emerald-500" />
                        ) : item.type === "rams" ? (
                          <FileText className="w-4 h-4 text-indigo-500" />
                        ) : item.type === "briefing" ? (
                          <Megaphone className="w-4 h-4 text-violet-500" />
                        ) : item.type === "delivery" ? (
                          <Package className="w-4 h-4 text-teal-500" />
                        ) : (
                          <UserPlus className="w-4 h-4 text-blue-500" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate flex items-center gap-2">
                          {isUnseen && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500" aria-hidden />
                          )}
                          <span className="truncate">{item.title}</span>
                          {isUnseen && (
                            <span className="shrink-0 text-xs font-semibold text-blue-600 dark:text-blue-400">
                              New
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {item.type === "attendance"
                            ? "Attendance"
                            : item.type === "near_miss"
                            ? "Near miss"
                            : item.type === "message"
                              ? "Message"
                              : item.type === "rams"
                                ? "RAMS"
                                : item.type === "briefing"
                                  ? "Briefing"
                                  : item.type === "delivery"
                                    ? "Delivery"
                                    : "Registration"}
                          {item.createdAt && ` · ${formatDateTime(item.createdAt)}`}
                        </p>
                      </div>
                    </Link>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
          {displayItems.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
              <Link
                href={
                  displayItems.some((i) => i.type === "message")
                    ? "/dashboard/messaging"
                    : displayItems.some((i) => i.type === "near_miss")
                      ? "/dashboard/health-and-safety/near-miss"
                      : displayItems.some((i) => i.type === "rams")
                        ? "/dashboard/health-and-safety/rams"
                        : displayItems.some((i) => i.type === "briefing")
                          ? "/dashboard/health-and-safety/briefings"
                            : displayItems.some((i) => i.type === "delivery")
                              ? "/dashboard/deliveries"
                              : displayItems.some((i) => i.type === "attendance")
                                ? "/dashboard/attendance"
                                : "/dashboard/users"
                }
                onClick={() => {
                  markItemsSeen(displayItems);
                  setOpen(false);
                }}
                className="block text-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                View all
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
