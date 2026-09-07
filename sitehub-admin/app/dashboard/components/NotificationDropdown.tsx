"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import { Bell, AlertCircle, UserPlus, MessageSquare, FileText, Megaphone, Package } from "lucide-react";
import Link from "next/link";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";

type NotificationItem =
  | { type: "near_miss"; id: string; title: string; href: string; createdAt?: string }
  | { type: "registration"; id: string; title: string; href: string; createdAt?: string }
  | { type: "message"; id: string; title: string; href: string; createdAt?: string }
  | { type: "rams"; id: string; title: string; href: string; createdAt?: string }
  | { type: "briefing"; id: string; title: string; href: string; createdAt?: string }
  | { type: "delivery"; id: string; title: string; href: string; createdAt?: string };

// Poll every 60s while the tab is visible. Previously 5s which fanned out to
// ~5 heavy API calls (RAMS/briefings/deliveries/…) per user per interval — the
// dominant cause of dashboard-wide sluggishness. Polling pauses entirely when
// the tab is hidden, and a fresh fetch runs on visibilitychange back to visible.
const NOTIFICATION_REFRESH_MS = 60_000;
/** Show dashboard bell items from the last 7 days (RAMS, briefings, etc.). */
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;
const SEEN_KEY = "sitehub_notif_seen";

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
    () => displayItems.filter((item) => !seenKeys.has(`${item.type}:${item.id}`)),
    [displayItems, seenKeys]
  );

  const [resolvedCompanyId, setResolvedCompanyId] = useState<string | null>(() => getCompanyIdFromClient());

  useEffect(() => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!role) return;

    const ensureCompanyId = async () => {
      if (companyId) return companyId;
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

    let isFirst = true;
    const fetchNotifications = async () => {
      const cid = companyId ?? resolvedCompanyId ?? (await ensureCompanyId());
      if (isFirst) {
        setLoading(true);
        isFirst = false;
      }
      try {
        const dayAgo = Date.now() - RECENT_MS;
        const fetches: Promise<Response>[] = [
          cid ? fetch(`/api/messages/threads?companyId=${encodeURIComponent(cid)}`, { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
        ];
        if (isAdminOrSupervisor) {
          fetches.push(
            fetch(`${qs("/api/near-miss", cid)}${qs("/api/near-miss", cid).includes("?") ? "&" : "?"}unreviewed=true&limit=10`, { cache: "no-store", credentials: "include" }),
            fetch("/api/auth/registrations", { cache: "no-store", credentials: "include" }),
            cid ? fetch(qs("/api/rams", cid), { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
            cid ? fetch(qs("/api/briefings", cid), { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
            cid ? fetch(qs("/api/deliveries", cid) + "&limit=20", { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
          );
        } else {
          fetches.push(
            cid ? fetch(qs("/api/rams", cid), { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
            cid ? fetch(qs("/api/briefings", cid), { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
            cid ? fetch(qs("/api/deliveries", cid) + (qs("/api/deliveries", cid).includes("?") ? "&" : "?") + "limit=20", { cache: "no-store", credentials: "include" }) : Promise.resolve(new Response("[]")),
          );
        }

        const [threadsRes, ...rest] = await Promise.all(fetches);
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
          regs.slice(0, 5).forEach((r: { id: string; data?: { email?: string; name?: string } }) => {
            const email = r.data?.email ?? "Unknown";
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
            .filter((t: { lastAt?: string }) => t.lastAt && new Date(t.lastAt).getTime() > dayAgo)
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
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    let interval: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (interval != null) return;
      interval = setInterval(fetchNotifications, NOTIFICATION_REFRESH_MS);
    };
    const stopPolling = () => {
      if (interval == null) return;
      clearInterval(interval);
      interval = null;
    };
    startPolling();

    // Pause polling while the tab is hidden; re-fetch immediately on return so
    // the badge is up to date. Cuts idle-tab background API load to zero.
    const handleVisibility = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState === "hidden") {
        stopPolling();
      } else {
        fetchNotifications();
        startPolling();
      }
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibility);
    }

    return () => {
      stopPolling();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibility);
      }
    };
  }, [resolvedCompanyId]);

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

  const hasNew = unseenItems.length > 0;

  const countsByType = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of unseenItems) {
      c[i.type] = (c[i.type] ?? 0) + 1;
    }
    return c;
  }, [unseenItems]);

  const unseenCount = unseenItems.length;

  const handleNotificationClick = useCallback((item: NotificationItem) => {
    markSeen(item.type, item.id);
    setSeenKeys((prev) => new Set([...prev, `${item.type}:${item.id}`]));
    setOpen(false);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-700/80 backdrop-blur-xl border border-gray-200/60 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-600 transition-all duration-300 relative group"
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
                    countsByType.near_miss && `${countsByType.near_miss} Near Miss`,
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
                  const isUnseen = !seenKeys.has(`${item.type}:${item.id}`);
                  return (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={item.href}
                      onClick={() => handleNotificationClick(item)}
                      className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <span className="shrink-0 mt-0.5">
                        {item.type === "near_miss" ? (
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
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                              New
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {item.type === "near_miss"
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
                            : "/dashboard/users"
                }
                onClick={() => {
                  displayItems.forEach((i) => {
                    markSeen(i.type, i.id);
                    setSeenKeys((p) => new Set([...p, `${i.type}:${i.id}`]));
                  });
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
