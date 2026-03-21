"use client";

import { useState } from "react";
import Table from "../components/ui/Table";
import { Building2, Users, MapPin, UserPlus, FileText, RefreshCw } from "lucide-react";
import Button from "../components/ui/Button";
import Link from "next/link";
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
    { refreshInterval: 60000 }
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Filter by company</label>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="input max-w-[220px]"
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
              </option>
            ))}
          </select>
        </div>
        <Button variant="secondary" onClick={() => mutate()} className="inline-flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Companies */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Companies</h2>
              <p className="text-sm text-gray-600">{companies.length} companies</p>
            </div>
          </div>
          <Link href="/dashboard/companies" className="text-blue-600 hover:underline text-sm font-medium">
            Manage →
          </Link>
        </div>
        <Table
          columns={[
            { header: "Name", accessor: "name" },
            { header: "ID", accessor: "id" },
            { header: "Users", accessor: "userCount" },
            { header: "Sites", accessor: "siteCount" },
          ]}
          data={filteredCompanies}
        />
      </section>

      {/* Users */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Users</h2>
              <p className="text-sm text-gray-600">{users.length} users</p>
            </div>
          </div>
          <Link href="/dashboard/all-users" className="text-blue-600 hover:underline text-sm font-medium">
            Manage →
          </Link>
        </div>
        <Table
          columns={[
            { header: "Email", accessor: "email" },
            { header: "Name", accessor: "name", render: (r: UserRow) => r.name ?? r.display_name ?? r.email ?? "—" },
            { header: "Role", accessor: "role" },
            {
              header: "Company",
              accessor: "company_id",
              render: (r: UserRow) => companyMap[r.company_id ?? ""] ?? r.company_id ?? "—",
            },
          ]}
          data={filteredUsers}
        />
      </section>

      {/* Sites */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sites</h2>
              <p className="text-sm text-gray-600">{sites.length} sites</p>
            </div>
          </div>
          <Link href="/dashboard/sites" className="text-blue-600 hover:underline text-sm font-medium">
            Manage →
          </Link>
        </div>
        <Table
          columns={[
            { header: "Name", accessor: "name" },
            { header: "Address", accessor: "address" },
            {
              header: "Company",
              accessor: "company_id",
              render: (r: Site) => companyMap[r.company_id ?? ""] ?? r.company_id ?? "—",
            },
          ]}
          data={filteredSites}
        />
      </section>

      {/* Registrations */}
      <section className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
            <UserPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Registrations</h2>
            <p className="text-sm text-gray-600">{registrations.length} registrations</p>
          </div>
        </div>
        <Table
          columns={[
            {
              header: "Email",
              accessor: "data",
              render: (r: Registration) => (r.data as { email?: string })?.email ?? "—",
            },
            {
              header: "Status",
              accessor: "data",
              render: (r: Registration) => (r.data as { status?: string })?.status ?? "—",
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
                r.created_at ? new Date(r.created_at).toLocaleString() : "—",
            },
          ]}
          data={filteredRegistrations}
        />
      </section>

      {/* Activity logs */}
      <section className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Activity logs</h2>
              <p className="text-sm text-gray-600">Audit and registration events</p>
            </div>
          </div>
          <Link href="/dashboard/system-logs" className="text-blue-600 hover:underline text-sm font-medium">
            Full logs →
          </Link>
        </div>
        {logs.length === 0 ? (
          <div className="py-8 text-center text-gray-500 text-sm">No activity yet</div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 py-2.5 px-4 rounded-lg bg-gray-50/60 border border-gray-200/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{entry.message}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {entry.time} {entry.source && `· ${entry.source}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
