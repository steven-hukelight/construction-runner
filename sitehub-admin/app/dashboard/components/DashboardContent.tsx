"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { FileText, MapPin, Users, ListTodo, type LucideIcon } from "lucide-react";
import { StatCard } from "./ui/stat-card";
import { EnhancedCard } from "./ui/enhanced-card";

const DashboardCharts = dynamic(
  () => import("./DashboardCharts").then((mod) => ({ default: mod.DashboardCharts })),
  {
    ssr: false,
    loading: () => (
      <div
        className="animate-pulse rounded-2xl border border-blue-100 bg-blue-50/50 dark:border-slate-600 dark:bg-slate-800 h-80 my-6"
        aria-hidden
      />
    ),
  }
);
import { formatDate } from "@/app/DisplayPreferencesProvider";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";
import type { DashboardDataSite, DashboardDataRams, DashboardDataUser, DashboardDataTask } from "./dashboardTypes";

// Helper function to get relative time (ISO string or legacy { toDate } or Date)
function getRelativeTime(timestamp: unknown): string {
  if (!timestamp) return 'Recently';
  const ts = timestamp as string | { toDate?: () => Date } | Date | number;
  const date =
    typeof ts === 'string'
      ? new Date(ts)
      : typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function'
        ? (ts as { toDate: () => Date }).toDate()
        : new Date(ts as number | Date);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return formatDate(date);
}

interface DashboardContentProps {
  totalSites: number;
  activeRAMS: number;
  totalUsers: number;
  totalTasks: number;
  sites: DashboardDataSite[];
  rams: DashboardDataRams[];
  users: DashboardDataUser[];
  tasks: DashboardDataTask[];
}

export function DashboardContent({
  totalSites,
  activeRAMS,
  totalUsers,
  totalTasks,
  sites,
  rams,
  users,
  tasks,
}: DashboardContentProps) {
  // Trust SSR props for the heavy lists — previously this client re-fetched
  // sites/rams/users/tasks on mount (duplicate of the server round-trip) and
  // again on every Realtime event, which made the home dashboard feel slow.
  const [pendingRegistrations, setPendingRegistrations] = useState<unknown[] | null>(null);
  const [unreviewedNearMiss, setUnreviewedNearMiss] = useState<number>(0);

  useEffect(() => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!role) return;

    const qs = (base: string) => {
      if (companyId) return `${base}?companyId=${encodeURIComponent(companyId)}`;
      return base;
    };

    const fetchAttentionCounts = async () => {
      try {
        const [regsRes, nearMissRes] = await Promise.all([
          fetch("/api/auth/registrations", { cache: "no-store", credentials: "include" }),
          fetch(`${qs("/api/near-miss")}${qs("/api/near-miss").includes("?") ? "&" : "?"}count=unreviewed`, {
            cache: "no-store",
            credentials: "include",
          }),
        ]);
        const regsData = regsRes.ok ? await regsRes.json() : null;
        if (Array.isArray(regsData)) setPendingRegistrations(regsData);
        if (nearMissRes?.ok) {
          const nm = await nearMissRes.json();
          setUnreviewedNearMiss(typeof nm?.count === "number" ? nm.count : 0);
        }
      } catch {
        /* ignore */
      }
    };

    void fetchAttentionCounts();
    const interval = setInterval(fetchAttentionCounts, 120_000);
    return () => clearInterval(interval);
  }, []);

  const effSites = sites;
  const effRAMS = rams;
  const effUsers = users;
  const effTasks = tasks;

  const effTotalSites = Array.isArray(effSites) ? effSites.length : totalSites;
  const effActiveRAMS = Array.isArray(effRAMS)
    ? effRAMS.filter((r) => (r.status ?? "").toUpperCase() === "APPROVED").length
    : activeRAMS;
  const effTotalUsers = Array.isArray(effUsers) ? effUsers.length : totalUsers;
  const effOpenTasks = Array.isArray(effTasks)
    ? effTasks.filter((t) => {
        const s = (t.status ?? "").toUpperCase();
        return s !== "COMPLETED" && s !== "DONE" && s !== "CANCELLED";
      }).length
    : totalTasks;

  return (
    <div className="space-y-8">
      {unreviewedNearMiss > 0 && (
        <Link
          href="/dashboard/health-and-safety/near-miss?unreviewed=true"
          className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-[0_8px_24px_rgba(37,76,128,0.06)] hover:bg-amber-100/80 dark:bg-amber-900/20"
        >
          <p className="font-semibold text-amber-900 dark:text-amber-200">
            {unreviewedNearMiss} new near miss{unreviewedNearMiss === 1 ? "" : "es"} reported
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Review in Health & Safety → Near Miss
          </p>
        </Link>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Sites" value={effTotalSites} icon={MapPin} color="blue" />
        <StatCard title="Approved RAMS" value={effActiveRAMS} icon={FileText} color="green" />
        <StatCard title="People" value={effTotalUsers} icon={Users} color="cyan" />
        <StatCard title="Open tasks" value={effOpenTasks} icon={ListTodo} color="orange" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/sites"
          className="flex items-center gap-3 rounded-2xl border border-blue-100/80 bg-white p-4 shadow-[0_8px_24px_rgba(37,76,128,0.07)] hover:border-blue-200 dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">Add a site</h3>
            <p className="text-sm text-gray-500">Set up a job and assign the team</p>
          </div>
        </Link>
        <Link
          href="/dashboard/health-and-safety/rams"
          className="flex items-center gap-3 rounded-2xl border border-blue-100/80 bg-white p-4 shadow-[0_8px_24px_rgba(37,76,128,0.07)] hover:border-blue-200 dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">Issue RAMS</h3>
            <p className="text-sm text-gray-500">Method statements for operatives to sign</p>
          </div>
        </Link>
        <Link
          href="/dashboard/users"
          className="flex items-center gap-3 rounded-2xl border border-blue-100/80 bg-white p-4 shadow-[0_8px_24px_rgba(37,76,128,0.07)] hover:border-blue-200 dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">Add people</h3>
            <p className="text-sm text-gray-500">Invite supervisors and operatives</p>
          </div>
        </Link>
      </div>

      {/* Charts Section */}
      <DashboardCharts 
        sites={effSites}
        rams={effRAMS}
        users={effUsers}
        tasks={effTasks}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedCard>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Latest on the job</h3>
            <p className="text-sm text-gray-500">Most recent site, RAMS and person activity</p>
          </div>
          <div className="space-y-3">
            {effSites && effSites[0] && (
              <ActivityItem
                icon={MapPin}
                title={`Site set up: ${effSites[0].name}`}
                time={getRelativeTime(effSites[0].created_at ?? effSites[0].createdAt)}
              />
            )}
            {effRAMS && effRAMS[0] && (
              <ActivityItem
                icon={FileText}
                title={`RAMS ${String(effRAMS[0].status ?? "added").toLowerCase()}: ${effRAMS[0].title || "Untitled"}`}
                time={getRelativeTime(effRAMS[0].created_at ?? effRAMS[0].createdAt)}
              />
            )}
            {effUsers && effUsers[0] && (
              <ActivityItem
                icon={Users}
                title={`Joined: ${effUsers[0].name ?? effUsers[0].display_name ?? "Team member"}`}
                time={getRelativeTime(effUsers[0].created_at ?? effUsers[0].createdAt)}
              />
            )}
            {(!effSites?.[0] && !effRAMS?.[0] && !effUsers?.[0]) && (
              <p className="py-4 text-sm text-gray-500">Nothing to show yet — add a site or invite people to get started.</p>
            )}
          </div>
        </EnhancedCard>

        <EnhancedCard>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Needs attention</h3>
            <p className="text-sm text-gray-500">Approvals, reviews and outstanding work</p>
          </div>
          <div className="space-y-3">
            {(() => {
              const pendingRAMS = effRAMS?.filter((r) => (r.status ?? "").toUpperCase() === "PENDING")?.length ?? 0;
              return pendingRAMS > 0 ? (
                <PendingItem title={`${pendingRAMS} RAMS waiting for review`} priority="high" />
              ) : null;
            })()}
            {unreviewedNearMiss > 0 && (
              <Link href="/dashboard/health-and-safety/near-miss?unreviewed=true">
                <PendingItem
                  title={`${unreviewedNearMiss} near miss${unreviewedNearMiss === 1 ? "" : "es"} to review`}
                  priority="high"
                />
              </Link>
            )}
            {(() => {
              const openTasks =
                effTasks?.filter((t) => {
                  const s = (t.status ?? "").toUpperCase();
                  return s !== "COMPLETED" && s !== "DONE" && s !== "CANCELLED";
                }).length ?? effOpenTasks;
              return openTasks > 0 ? (
                <PendingItem title={`${openTasks} site task${openTasks === 1 ? "" : "s"} still open`} priority="medium" />
              ) : null;
            })()}
            {(() => {
              const pendingCount = pendingRegistrations?.length ?? 0;
              return pendingCount > 0 ? (
                <PendingItem
                  title={`${pendingCount} registration${pendingCount === 1 ? "" : "s"} waiting for approval`}
                  priority="low"
                />
              ) : null;
            })()}
            {(effRAMS?.filter((r) => (r.status ?? "").toUpperCase() === "PENDING").length ?? 0) === 0 &&
              unreviewedNearMiss === 0 &&
              (pendingRegistrations?.length ?? 0) === 0 &&
              (effTasks?.filter((t) => {
                const s = (t.status ?? "").toUpperCase();
                return s !== "COMPLETED" && s !== "DONE" && s !== "CANCELLED";
              }).length ?? 0) === 0 && (
                <p className="py-4 text-sm text-gray-500">Nothing waiting — you&apos;re clear for now.</p>
              )}
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}

// --- Types and Helper Components ---
function ActivityItem({ icon: Icon, title, time }: { icon: LucideIcon; title: string; time: string; color?: "blue" | "green" | "cyan" }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <Icon className="w-4 h-4 text-gray-400 shrink-0" />
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{title}</p>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
    </div>
  );
}

function PendingItem({ title, priority }: { title: string; priority: "high" | "medium" | "low" }) {
  const priorityLabels = {
    high: "Urgent",
    medium: "Open",
    low: "Review",
  };
  const priorityColors = {
    high: "text-red-700 bg-red-50",
    medium: "text-orange-700 bg-orange-50",
    low: "text-blue-700 bg-blue-50",
  };
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-slate-700 last:border-b-0">
      <p className="text-sm text-gray-900 dark:text-slate-100">{title}</p>
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityColors[priority]}`}>
        {priorityLabels[priority]}
      </span>
    </div>
  );
}
