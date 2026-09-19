"use client";

import { useState } from "react";
import { formatDateTime } from "@/app/DisplayPreferencesProvider";
import Table from "../components/ui/Table";
import { DataTableShell, TableNameCell } from "../components/ui/TableChrome";
import { Building2, Users, MapPin, UserPlus, RefreshCw } from "lucide-react";
import Button from "../components/ui/Button";
import Link from "next/link";
import { CompanyPicker } from "../components/ui/SitePicker";
import useSWR from "swr";

type UserRow = { id: string; email?: string | null; name?: string | null; display_name?: string | null; role?: string | null; company_id?: string | null };
type Site = { id: string; name?: string; company_id?: string | null; address?: string | null };
type Registration = { id: string; user_id?: string | null; company_id?: string | null; data?: { email?: string; status?: string }; created_at?: string };

export default function SuperuserAdminClient() {
  const [companyFilter, setCompanyFilter] = useState<string>("");

  const fetcher = async () => {
    const [c, u, s, r, l] = await Promise.all([
      fetch("/api/companies").then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])),
      fetch("/api/users?all=true", { credentials: "include" }).then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])),
      fetch("/api/sites?all=true", { credentials: "include" }).then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])),
      fetch("/api/registrations").then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])),
      fetch("/api/maintenance/activity-log").then((r) => r.json()).then((d) => (Array.isArray(d) ? d : [])),
    ]);
    return { companies: c, users: u, sites: s, registrations: r, logs: l };
  };

  const { data, isLoading, mutate } = useSWR(
    "superuser-admin-dashboard",
    fetcher,
    { refreshInterval: 15_000 }
  );

  const companies = data?.companies ?? [];
  const users = data?.users ?? [];
  const sites = data?.sites ?? [];
  const registrations = data?.registrations ?? [];
  const logs = data?.logs ?? [];

  if (isLoading) {
    return (
      <div className="py-16 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const companyMap = companies.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.name ?? c.id;
    return acc;
  }, {});

  const filteredCompanies = companyFilter ? companies.filter((c) => c.id === companyFilter) : companies;
  const filteredUsers = companyFilter ? users.filter((u) => u.company_id === companyFilter) : users;
  const filteredSites = companyFilter ? sites.filter((s) => s.company_id === companyFilter) : sites;
  const filteredRegistrations = companyFilter ? registrations.filter((r) => r.company_id === companyFilter) : registrations;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-64">
          <CompanyPicker
            companies={companies}
            value={companyFilter}
            onChange={setCompanyFilter}
            variant="compact"
            allowNone
            noneValue=""
            noneLabel="All companies"
            placeholder="All companies"
          />
        </div>
        <Button variant="secondary" onClick={() => mutate()} className="inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Companies */}
      <Table
        title="Companies"
        subtitle={`${companies.length} companies`}
        actions={
          <Link href="/dashboard/companies" className="table-link">
            Manage
          </Link>
        }
        columns={[
            { header: "Name", accessor: "name", render: (r: { name?: string }) => <TableNameCell icon={Building2} label={r.name || "—"} /> },
            { header: "ID", accessor: "id" },
            { header: "Users", accessor: "userCount" },
            { header: "Sites", accessor: "siteCount" },
          ]}
          data={filteredCompanies}
      />

      <Table
        title="Users"
        subtitle={`${users.length} users`}
        actions={
          <Link href="/dashboard/all-users" className="table-link">
            Manage
          </Link>
        }
        columns={[
            { header: "Email", accessor: "email" },
            { header: "Name", accessor: "name", render: (r: UserRow) => <TableNameCell icon={Users} label={r.name ?? r.display_name ?? r.email ?? "—"} /> },
            { header: "Role", accessor: "role" },
            {
              header: "Company",
              accessor: "company_id",
              render: (r: UserRow) => companyMap[r.company_id ?? ""] ?? r.company_id ?? "—",
            },
          ]}
        data={filteredUsers}
      />

      <Table
        title="Sites"
        subtitle={`${sites.length} sites`}
        actions={
          <Link href="/dashboard/sites" className="table-link">
            Manage
          </Link>
        }
        columns={[
            { header: "Name", accessor: "name", render: (r: Site) => <TableNameCell icon={MapPin} label={r.name || "—"} /> },
            { header: "Address", accessor: "address" },
            {
              header: "Company",
              accessor: "company_id",
              render: (r: Site) => companyMap[r.company_id ?? ""] ?? r.company_id ?? "—",
            },
          ]}
        data={filteredSites}
      />

      <Table
        title="Registrations"
        subtitle={`${registrations.length} registrations`}
        columns={[
            {
              header: "Email",
              accessor: "data",
              render: (r: Registration) => (
                <TableNameCell icon={UserPlus} label={(r.data as { email?: string })?.email ?? "—"} />
              ),
            },
            {
              header: "Status",
              accessor: "data",
              render: (r: Registration) => {
                const status = (r.data as { status?: string })?.status ?? "—";
                const chip =
                  status === "PENDING" || status === "COMPANY_ADMIN_PENDING"
                    ? "status-chip--warn"
                    : status === "APPROVED"
                      ? "status-chip--ok"
                      : "status-chip--muted";
                return <span className={`status-chip ${chip}`}>{status}</span>;
              },
            },
            {
              header: "Company",
              accessor: "company_id",
              render: (r: Registration) => companyMap[r.company_id ?? ""] ?? r.company_id ?? "—",
            },
            {
              header: "Created",
              accessor: "created_at",
              render: (r: Registration) =>
                r.created_at ? formatDateTime(r.created_at) : "—",
            },
          ]}
        data={filteredRegistrations}
      />

      <DataTableShell
        title="Activity logs"
        subtitle="Audit and registration events"
        actions={
          <Link href="/dashboard/system-logs" className="table-link">
            Full logs
          </Link>
        }
      >
        {logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No activity yet</div>
        ) : (
          <div className="max-h-[320px] space-y-1 overflow-y-auto px-2 py-2">
            {logs.map((entry) => (
              <div key={entry.id} className="rounded-xl px-4 py-2.5 hover:bg-blue-50/70">
                <p className="text-sm text-slate-900">{entry.message}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {entry.time} {entry.source && `· ${entry.source}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </DataTableShell>
    </div>
  );
}
