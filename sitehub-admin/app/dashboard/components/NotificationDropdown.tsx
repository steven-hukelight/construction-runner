"use client";

import { useEffect, useState, useRef } from "react";
import { Bell, AlertCircle, UserPlus } from "lucide-react";
import Link from "next/link";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";

type NotificationItem =
  | { type: "near_miss"; id: string; title: string; href: string; createdAt?: string }
  | { type: "registration"; id: string; title: string; href: string; createdAt?: string };

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!role || role === "operative") return;

    const qs = (base: string) => {
      if (companyId) return `${base}?companyId=${encodeURIComponent(companyId)}`;
      return base;
    };

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const [nearMissRes, regsRes] = await Promise.all([
          fetch(`${qs("/api/near-miss")}${qs("/api/near-miss").includes("?") ? "&" : "?"}unreviewed=true&limit=10`, {
            cache: "no-store",
            credentials: "include",
          }),
          fetch("/api/auth/registrations", { cache: "no-store", credentials: "include" }),
        ]);

        const nearMisses = nearMissRes.ok ? await nearMissRes.json() : [];
        const regs = regsRes.ok ? await regsRes.json() : [];

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
        setItems(list);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

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

  const hasNew = items.length > 0;

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
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-slate-400">No new notifications</div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-slate-600">
                {items.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors text-left"
                    >
                      <span className="shrink-0 mt-0.5">
                        {item.type === "near_miss" ? (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <UserPlus className="w-4 h-4 text-blue-500" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{item.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          {item.type === "near_miss" ? "Near miss" : "Registration"}
                          {item.createdAt && ` · ${new Date(item.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {items.length > 0 && (
            <div className="p-2 border-t border-gray-100 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
              <Link
                href={items.some((i) => i.type === "near_miss") ? "/dashboard/health-and-safety/near-miss" : "/dashboard/users"}
                onClick={() => setOpen(false)}
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
