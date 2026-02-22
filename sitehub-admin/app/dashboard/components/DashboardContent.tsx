"use client";

import { useEffect, useState } from "react";
import { PlusCircle, FileText, MapPin, Users, ListTodo, Megaphone, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { StatCard } from "./ui/stat-card";
import { EnhancedCard } from "./ui/enhanced-card";
import { DashboardCharts } from "./DashboardCharts";
import { supabase } from "@/supabase/auth/client";
import { getCompanyIdFromClient, getRoleFromClient } from "@/lib/utils/cookies";

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
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface DashboardContentProps {
  totalSites: number;
  activeRAMS: number;
  totalUsers: number;
  totalTasks: number;
  totalNotices: number;
  sites: any[];
  rams: any[];
  users: any[];
  tasks: any[];
}

export function DashboardContent({
  totalSites,
  activeRAMS,
  totalUsers,
  totalTasks,
  totalNotices,
  sites,
  rams,
  users,
  tasks,
}: DashboardContentProps) {
  const [liveSites, setLiveSites] = useState<any[] | null>(null);
  const [liveRAMS, setLiveRAMS] = useState<any[] | null>(null);
  const [liveUsers, setLiveUsers] = useState<any[] | null>(null);
  const [liveTasks, setLiveTasks] = useState<any[] | null>(null);
  const [liveNotices, setLiveNotices] = useState<any[] | null>(null);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[] | null>(null);
  const [unreviewedNearMiss, setUnreviewedNearMiss] = useState<number>(0);

  useEffect(() => {
    const role = getRoleFromClient();
    const companyId = getCompanyIdFromClient();
    if (!role) return;

    const qs = (base: string) => {
      if (role === "superuser" && companyId) return `${base}?companyId=${encodeURIComponent(companyId)}`;
      if (companyId) return `${base}?companyId=${encodeURIComponent(companyId)}`;
      return base;
    };

    const fetchAll = async () => {
      try {
        const [sitesRes, ramsRes, usersRes, tasksRes, noticesRes, regsRes, nearMissRes] = await Promise.all([
          fetch(qs("/api/sites"), { cache: "no-store", credentials: "include" }),
          fetch(qs("/api/rams"), { cache: "no-store", credentials: "include" }),
          fetch(qs("/api/users"), { cache: "no-store", credentials: "include" }),
          fetch(qs("/api/tasks"), { cache: "no-store", credentials: "include" }),
          fetch(qs("/api/notices"), { cache: "no-store", credentials: "include" }),
          fetch("/api/auth/registrations", { cache: "no-store", credentials: "include" }),
          fetch(`${qs("/api/near-miss")}${qs("/api/near-miss").includes("?") ? "&" : "?"}count=unreviewed`, { cache: "no-store", credentials: "include" }),
        ]);
        const sitesData = sitesRes.ok ? await sitesRes.json() : null;
        const ramsData = ramsRes.ok ? await ramsRes.json() : null;
        const usersData = usersRes.ok ? await usersRes.json() : null;
        const tasksData = tasksRes.ok ? await tasksRes.json() : null;
        const noticesData = noticesRes.ok ? await noticesRes.json() : null;
        const regsData = regsRes.ok ? await regsRes.json() : null;
        if (Array.isArray(sitesData)) setLiveSites(sitesData);
        if (Array.isArray(ramsData)) setLiveRAMS(ramsData);
        if (Array.isArray(usersData)) setLiveUsers(usersData);
        if (Array.isArray(tasksData)) setLiveTasks(tasksData);
        if (Array.isArray(noticesData)) setLiveNotices(noticesData);
        if (Array.isArray(regsData)) setPendingRegistrations(regsData);
        if (nearMissRes?.ok) {
          const nm = await nearMissRes.json();
          setUnreviewedNearMiss(typeof nm?.count === "number" ? nm.count : 0);
        }
      } catch {
        /* ignore init errors */
      }
    };

    fetchAll();

    // Realtime: filter by company_id for non-superusers
    const filterCol = "company_id";
    const useFilter = role !== "superuser" && companyId;
    const realtimeFilter = useFilter ? `${filterCol}=eq.${companyId}` : undefined;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sites", filter: realtimeFilter }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "rams", filter: realtimeFilter }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: realtimeFilter }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: realtimeFilter }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "notices", filter: realtimeFilter }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "near_miss", filter: realtimeFilter }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const effSites = liveSites ?? sites;
  const effRAMS = liveRAMS ?? rams;
  const effUsers = liveUsers ?? users;
  const effTasks = liveTasks ?? tasks;
  const effNotices = liveNotices ?? [];

  const effTotalSites = Array.isArray(effSites) ? effSites.length : totalSites;
  const effActiveRAMS = Array.isArray(effRAMS) ? (effRAMS.filter((r: any) => r.status === "APPROVED").length) : activeRAMS;
  const effTotalUsers = Array.isArray(effUsers) ? effUsers.length : totalUsers;
  const effTotalTasks = Array.isArray(effTasks) ? effTasks.length : totalTasks;
  const effTotalNotices = Array.isArray(effNotices) ? effNotices.length : totalNotices;

  return (
    <div className="space-y-10">
      {/* Near miss notification banner – prominent when new near misses reported */}
      {unreviewedNearMiss > 0 && (
        <a
          href="/dashboard/health-and-safety/near-miss?unreviewed=true"
          className="block rounded-xl border-2 border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500">
              <AlertCircle className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-900">
                {unreviewedNearMiss} new near miss{unreviewedNearMiss === 1 ? "" : "es"} reported
              </p>
              <p className="text-sm text-amber-800">
                Review in Health & Safety → Near Miss
              </p>
            </div>
          </div>
        </a>
      )}
      {/* Enhanced Stats Grid with breathing room */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          title="Total Sites" 
          value={effTotalSites} 
          icon={MapPin} 
          color="blue"
          trend={{ value: 12, isPositive: true }}
          delay={0}
        />
        <StatCard 
          title="Active RAMS" 
          value={effActiveRAMS} 
          icon={FileText} 
          color="green"
          trend={{ value: 8, isPositive: true }}
          delay={0.1}
        />
        <StatCard 
          title="Users" 
          value={effTotalUsers} 
          icon={Users} 
          color="cyan"
          trend={{ value: 5, isPositive: true }}
          delay={0.2}
        />
        <StatCard 
          title="Tasks" 
          value={effTotalTasks} 
          icon={ListTodo} 
          color="orange"
          trend={{ value: 3, isPositive: false }}
          delay={0.3}
        />
        <StatCard 
          title="Notices" 
          value={effTotalNotices} 
          icon={Megaphone} 
          color="sky"
          trend={{ value: 15, isPositive: true }}
          delay={0.4}
        />
      </div>

      {/* Charts Section */}
      <DashboardCharts 
        sites={effSites}
        rams={effRAMS}
        users={effUsers}
        tasks={effTasks}
      />

      {/* Quick Actions */}
      <EnhancedCard gradient delay={0.5}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-lg shadow-blue-500/30">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">Quick Actions</h2>
                <p className="text-sm text-gray-500">Frequently used shortcuts</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/dashboard/sites" 
              className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 border border-blue-200/50 hover:border-blue-400 hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16" />
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <PlusCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Add Site</h3>
                  <p className="text-sm text-gray-600">Create new location</p>
                </div>
              </div>
            </a>

            <a 
              href="/dashboard/rams" 
              className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-green-50 via-green-50 to-emerald-50 hover:shadow-xl hover:shadow-green-500/20 transition-all duration-500 border border-green-200/50 hover:border-green-400 hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full -mr-16 -mt-16" />
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Upload RAMS</h3>
                  <p className="text-sm text-gray-600">Safety documentation</p>
                </div>
              </div>
            </a>

            <a 
              href="/dashboard/users" 
              className="group relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-sky-50 via-blue-50 to-cyan-50 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-500 border border-blue-200/50 hover:border-blue-400 hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/10 rounded-full -mr-16 -mt-16" />
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/50 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">Invite User</h3>
                  <p className="text-sm text-gray-600">Add team member</p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </EnhancedCard>

      {/* Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EnhancedCard delay={0.6}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg shadow-green-500/30">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recent Activity</h3>
              <p className="text-sm text-gray-500">Latest updates</p>
            </div>
          </div>
          <div className="space-y-3">
            {/* Most recent site */}
            {effSites && effSites[0] && (
              <ActivityItem 
                icon={MapPin}
                title={`Site added: ${effSites[0].name}`}
                time={getRelativeTime(effSites[0].created_at ?? effSites[0].createdAt)}
                color="blue"
              />
            )}
            {/* Most recent RAMS */}
            {effRAMS && effRAMS[0] && (
              <ActivityItem 
                icon={FileText}
                title={`RAMS ${effRAMS[0].status?.toLowerCase()}: ${effRAMS[0].title || 'Document'}`}
                time={getRelativeTime(effRAMS[0].created_at ?? effRAMS[0].createdAt)}
                color="green"
              />
            )}
            {/* Most recent user */}
            {effUsers && effUsers[0] && (
              <ActivityItem 
                icon={Users}
                title={`User registered: ${effUsers[0].name ?? effUsers[0].display_name}`}
                time={getRelativeTime(effUsers[0].created_at ?? effUsers[0].createdAt)}
                color="cyan"
              />
            )}
          </div>
        </EnhancedCard>

        <EnhancedCard delay={0.7}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Pending Items</h3>
              <p className="text-sm text-gray-500">Requires attention</p>
            </div>
          </div>
          <div className="space-y-3">
            {/* Active tasks count */}
            {effTotalTasks > 0 && (
              <PendingItem 
                title={`${effTotalTasks} task${effTotalTasks === 1 ? '' : 's'} to complete`}
                priority="medium"
              />
            )}
            {/* Pending RAMS count */}
            {(() => {
              const pendingRAMS = effRAMS?.filter((r: any) => r.status === 'PENDING')?.length ?? 0;
              return pendingRAMS > 0 ? (
                <PendingItem 
                  title={`${pendingRAMS} RAMS awaiting review`}
                  priority="high"
                />
              ) : null;
            })()}
            {/* Unreviewed near misses */}
            {unreviewedNearMiss > 0 && (
              <a href="/dashboard/health-and-safety/near-miss?unreviewed=true">
                <PendingItem 
                  title={`${unreviewedNearMiss} near miss${unreviewedNearMiss === 1 ? '' : 'es'} to review`}
                  priority="high"
                />
              </a>
            )}
            {/* Pending registrations – same source as Approvals modal */}
            {(() => {
              const pendingCount = pendingRegistrations?.length ?? 0;
              return pendingCount > 0 ? (
                <PendingItem 
                  title={`${pendingCount} registration${pendingCount === 1 ? '' : 's'} pending approval`}
                  priority="low"
                />
              ) : null;
            })()}
          </div>
        </EnhancedCard>
      </div>
    </div>
  );
}

// --- Types and Helper Components ---
type TimestampLike = string | { toDate?: () => Date } | Date | null | undefined;

interface Site {
  id: string;
  name?: string;
  createdAt?: TimestampLike;
  [key: string]: any;
}
interface RAMS {
  id: string;
  title?: string;
  status?: string;
  createdAt?: TimestampLike;
  [key: string]: any;
}
interface User {
  id: string;
  name?: string;
  approved?: boolean;
  createdAt?: TimestampLike;
  [key: string]: any;
}
interface Task {
  id: string;
  [key: string]: any;
}

function ActivityItem({ icon: Icon, title, time, color }: { icon: any; title: string; time: string; color: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/60 border border-white/30 shadow-sm">
      <div className={`p-2 rounded-xl bg-${color}-100 text-${color}-700`}><Icon className="w-5 h-5" /></div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <span className="text-xs text-gray-500">{time}</span>
      </div>
    </div>
  );
}

function PendingItem({ title, priority }: { title: string; priority: "high" | "medium" | "low" }) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-orange-100 text-orange-700 border-orange-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };
  return (
    <div className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/10 transition-all duration-300 border border-white/20 hover:border-white/40">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <span className={`text-xs font-medium px-3 py-1.5 rounded-full border shadow-sm ${priorityColors[priority]}`}>{priority}</span>
    </div>
  );
}
