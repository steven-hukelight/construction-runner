"use client";

import { useMemo, useState } from "react";
import { EnhancedCard } from "./ui/enhanced-card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type {
  DashboardDataTask,
  DashboardDataUser,
  DashboardDataSite,
  DashboardDataRams,
  TimestampLike,
} from "./dashboardTypes";

interface DashboardChartsProps {
  sites: DashboardDataSite[];
  rams: DashboardDataRams[];
  users: DashboardDataUser[];
  tasks: DashboardDataTask[];
}

const COLORS = ["#2563eb", "#0d9488", "#0284c7", "#d97706", "#dc2626"];

function getMonthName(monthIndex: number) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return months[monthIndex];
}

function parseDate(val: TimestampLike): Date | null {
  if (!val) return null;
  if (typeof val === "string") return new Date(val);
  if (typeof val === "object" && val !== null && typeof (val as { toDate?: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate();
  }
  try {
    return new Date(val as number | Date);
  } catch {
    return null;
  }
}

function getMonthlyOpsData(
  sites: DashboardDataSite[],
  rams: DashboardDataRams[],
  users: DashboardDataUser[],
  tasks: DashboardDataTask[]
) {
  const monthlyMap = new Map<
    string,
    { month: string; sites: number; rams: number; people: number; tasks: number }
  >();
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthlyMap.set(key, {
      month: getMonthName(date.getMonth()),
      sites: 0,
      rams: 0,
      people: 0,
      tasks: 0,
    });
  }

  const bump = (items: { created_at?: TimestampLike; createdAt?: TimestampLike }[] | undefined, field: "sites" | "rams" | "people" | "tasks") => {
    items?.forEach((item) => {
      const date = parseDate(item.created_at ?? item.createdAt);
      if (!date) return;
      const bucket = monthlyMap.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (bucket) bucket[field]++;
    });
  };

  bump(sites, "sites");
  bump(rams, "rams");
  bump(users, "people");
  bump(tasks, "tasks");

  return Array.from(monthlyMap.values());
}

function ChartHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-blue-100 bg-[#f7fafc] px-6 text-center text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-400">
      {message}
    </div>
  );
}

export function DashboardCharts({ sites, rams, users, tasks }: DashboardChartsProps) {
  const [activityView, setActivityView] = useState<"added" | "tasks">("added");
  const [ramsView, setRamsView] = useState<"pie" | "bar">("pie");
  const [peopleView, setPeopleView] = useState<"roles" | "tasks">("roles");

  const monthlyOpsData = useMemo(
    () => getMonthlyOpsData(sites, rams, users, tasks),
    [sites, rams, users, tasks]
  );

  const ramsStatusData = useMemo(() => {
    const approved = rams?.filter((r) => (r.status ?? "").toUpperCase() === "APPROVED").length || 0;
    const pending = rams?.filter((r) => (r.status ?? "").toUpperCase() === "PENDING").length || 0;
    const rejected = rams?.filter((r) => (r.status ?? "").toUpperCase() === "REJECTED").length || 0;
    return [
      { name: "Approved", value: approved },
      { name: "Awaiting review", value: pending },
      { name: "Rejected", value: rejected },
    ].filter((item) => item.value > 0);
  }, [rams]);

  const taskStatusData = useMemo(() => {
    return [
      { name: "Completed", value: tasks?.filter((t) => (t.status ?? "").toUpperCase() === "COMPLETED").length || 0 },
      { name: "In progress", value: tasks?.filter((t) => (t.status ?? "").toUpperCase() === "IN_PROGRESS").length || 0 },
      {
        name: "To do",
        value:
          tasks?.filter((t) => {
            const s = (t.status ?? "").toUpperCase();
            return !s || s === "PENDING" || s === "TODO" || s === "OPEN";
          }).length || 0,
      },
    ].filter((item) => item.value > 0);
  }, [tasks]);

  const roleData = useMemo(() => {
    const counts = new Map<string, number>();
    const labelFor = (role: string | undefined) => {
      const r = (role ?? "").toLowerCase();
      if (r === "operative") return "Operatives";
      if (r === "supervisor") return "Supervisors";
      if (r === "admin" || r === "site_admin") return "Admins";
      if (r === "sub_admin") return "Subcontractor admins";
      if (r === "superuser") return "Superusers";
      return role ? role.replace(/_/g, " ") : "Other";
    };
    users?.forEach((u) => {
      const label = labelFor(u.role);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [users]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <EnhancedCard>
        <ChartHeader
          title="What's been added"
          description="New sites, RAMS, people and tasks created over the last six months."
        />
        <div className="admin-tabs mb-4">
          <button
            type="button"
            onClick={() => setActivityView("added")}
            className={activityView === "added" ? "active" : ""}
          >
            Sites · RAMS · people
          </button>
          <button
            type="button"
            onClick={() => setActivityView("tasks")}
            className={activityView === "tasks" ? "active" : ""}
          >
            Tasks raised
          </button>
        </div>
        {activityView === "added" ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyOpsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis allowDecimals={false} stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Line type="monotone" dataKey="sites" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} name="Sites" />
              <Line type="monotone" dataKey="rams" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} name="RAMS" />
              <Line type="monotone" dataKey="people" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} name="People" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyOpsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis allowDecimals={false} stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "12px" }} />
              <Bar dataKey="tasks" fill="#2563eb" radius={[8, 8, 0, 0]} name="Tasks raised" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </EnhancedCard>

      <EnhancedCard>
        <ChartHeader
          title="RAMS status"
          description="How method statements stand today — approved, waiting for review, or rejected."
        />
        <div className="admin-tabs mb-4">
          <button type="button" onClick={() => setRamsView("pie")} className={ramsView === "pie" ? "active" : ""}>
            Breakdown
          </button>
          <button type="button" onClick={() => setRamsView("bar")} className={ramsView === "bar" ? "active" : ""}>
            Counts
          </button>
        </div>
        {ramsStatusData.length === 0 ? (
          <EmptyChart message="No RAMS yet. Upload method statements under Health & Safety → RAMS." />
        ) : ramsView === "pie" ? (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={ramsStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={95}
                fill="#2563eb"
                dataKey="value"
              >
                {ramsStatusData.map((_, index) => (
                  <Cell key={`rams-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ramsStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis allowDecimals={false} stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#0d9488" radius={[8, 8, 0, 0]} name="RAMS" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </EnhancedCard>

      <EnhancedCard className="lg:col-span-2">
        <ChartHeader
          title="Team & site work"
          description="Who is in the company, and how site tasks are progressing."
        />
        <div className="admin-tabs mb-4">
          <button
            type="button"
            onClick={() => setPeopleView("roles")}
            className={peopleView === "roles" ? "active" : ""}
          >
            People by role
          </button>
          <button
            type="button"
            onClick={() => setPeopleView("tasks")}
            className={peopleView === "tasks" ? "active" : ""}
          >
            Task progress
          </button>
        </div>
        {peopleView === "roles" ? (
          roleData.length === 0 ? (
            <EmptyChart message="No people in this company yet. Invite the team from Users." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roleData} layout="vertical" margin={{ left: 24, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" allowDecimals={false} stroke="#6b7280" style={{ fontSize: "12px" }} />
                <YAxis type="category" dataKey="name" width={140} stroke="#6b7280" style={{ fontSize: "12px" }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="#2563eb" radius={[0, 8, 8, 0]} name="People" />
              </BarChart>
            </ResponsiveContainer>
          )
        ) : taskStatusData.length === 0 ? (
          <EmptyChart message="No site tasks yet. Create tasks from the Tasks page." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={taskStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: "12px" }} />
              <YAxis allowDecimals={false} stroke="#6b7280" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="#0284c7" radius={[8, 8, 0, 0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </EnhancedCard>
    </div>
  );
}
