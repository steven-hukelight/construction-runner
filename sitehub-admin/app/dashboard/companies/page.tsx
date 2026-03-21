"use client";

import { useEffect, useState } from "react";
import PageHeader from "../components/PageHeader";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import { getRoleFromClient } from "@/lib/utils/cookies";
import { Building2, Plus, Copy, Check } from "lucide-react";

type Company = {
  id: string;
  name: string | null;
  inviteCode: string | null;
  createdAt: string | null;
  status: string;
  userCount?: number;
  siteCount?: number;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<Company | null>(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>("");

  function loadCompanies() {
    setLoading(true);
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  async function handleEnterDashboard(companyId: string) {
    if (typeof window === "undefined") return;
    const role = getRoleFromClient();
    const opts = `path=/; max-age=2592000; SameSite=Lax${window.location?.protocol === "https:" ? "; Secure" : ""}`;
    if (role === "superuser") {
      const res = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
        credentials: "include",
      });
      if (res.ok) {
        // Belt-and-suspenders: API sets cookies via Set-Cookie, but also set client-side
        // so they're definitely available before redirect (avoids "no company" / empty data)
        try {
          document.cookie = `companyId=${encodeURIComponent(companyId)}; ${opts}`;
          document.cookie = `impersonating=true; ${opts}`;
        } catch {
          /* document.cookie access denied */
        }
      } else {
        try {
          document.cookie = `companyId=${encodeURIComponent(companyId)}; ${opts}`;
          document.cookie = `impersonating=true; ${opts}`;
        } catch {
          /* document.cookie access denied */
        }
      }
    } else {
      try {
        document.cookie = `companyId=${encodeURIComponent(companyId)}; ${opts}`;
      } catch {
        /* document.cookie access denied */
      }
    }
    window.location.href = "/dashboard";
  }

  async function handleRegenerateInviteCode(companyId: string) {
    setRegeneratingId(companyId);
    const token = typeof window !== "undefined" ? window.localStorage.getItem("sb_token") : null;
    try {
      const res = await fetch(`/api/company/${companyId}/regenerateInviteCode`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.inviteCode) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === companyId ? { ...c, inviteCode: data.inviteCode } : c))
        );
      }
    } finally {
      setRegeneratingId(null);
    }
  }

  function copyInviteCode(companyId: string, code: string) {
    if (typeof navigator?.clipboard === "undefined") return;
    navigator.clipboard.writeText(code);
    setCopiedId(companyId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleUpdateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!editModal) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/companies/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === editModal.id ? { ...c, name: editName.trim() } : c))
        );
        setEditModal(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleSetStatus(companyId: string, status: string) {
    setUpdating(true);
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === companyId ? { ...c, status } : c))
        );
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update");
      }
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteCompany(company: Company, force: boolean) {
    try {
      const res = await fetch(`/api/companies/${company.id}?force=${force}`, { method: "DELETE" });
      if (res.ok) {
        setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      }
    } finally {
    }
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (res.ok) {
        setCreateName("");
        setCreateOpen(false);
        loadCompanies();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create company");
      }
    } finally {
      setCreating(false);
    }
  }

  const columns = [
    { header: "Name", accessor: "name", render: (row: Company) => row.name || "—" },
    {
      header: "Invite code",
      accessor: "inviteCode",
      render: (row: Company) =>
        row.inviteCode ? (
          <span className="inline-flex items-center gap-2 font-mono text-sm">
            {row.inviteCode}
            <button
              type="button"
              onClick={() => copyInviteCode(row.id, row.inviteCode!)}
              className="p-1 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
              title="Copy"
            >
              {copiedId === row.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </span>
        ) : (
          "—"
        ),
    },
    {
      header: "Created",
      accessor: "createdAt",
      render: (row: Company) =>
        row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—",
    },
    {
      header: "Status",
      accessor: "status",
      render: (row: Company) => (
        <span
          className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${
            row.status === "Active"
              ? "bg-green-50 text-green-700 border-green-200/60"
              : row.status === "Archived"
                ? "bg-gray-100 text-gray-700 border-gray-200/60"
                : "bg-amber-50 text-amber-700 border-amber-200/60"
          }`}
        >
          {row.status || "Active"}
        </span>
      ),
    },
    { header: "Users", accessor: "userCount", render: (row: Company) => row.userCount ?? "—" },
    { header: "Sites", accessor: "siteCount", render: (row: Company) => row.siteCount ?? "—" },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: Company) => {
        const hasData = (row.userCount ?? 0) > 0 || (row.siteCount ?? 0) > 0;
        const menuItems = [
          { label: "Enter dashboard", onClick: () => handleEnterDashboard(row.id) },
          {
            label: regeneratingId === row.id ? "Regenerating…" : "Regenerate invite code",
            onClick: () => handleRegenerateInviteCode(row.id),
          },
          {
            label: "Edit name",
            onClick: () => {
              setEditModal(row);
              setEditName(row.name || "");
            },
          },
          ...(row.status !== "Disabled" ? [{ label: "Disable", onClick: () => handleSetStatus(row.id, "Disabled") }] : []),
          ...(row.status !== "Archived" ? [{ label: "Archive", onClick: () => handleSetStatus(row.id, "Archived") }] : []),
          {
            label: "Delete company",
            onClick: () => {
              if (!window.confirm(hasData ? `Delete "${row.name || row.id}"? This company has users/sites. Use "Delete (force)" to delete anyway.` : `Delete "${row.name || row.id}"?`)) return;
              handleDeleteCompany(row, hasData);
            },
            variant: "danger" as const,
          },
        ];
        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleEnterDashboard(row.id)}
              className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Enter dashboard
            </button>
            <TableActions items={menuItems} />
          </div>
        );
      },
    },
  ];

  return (
    <div className="relative space-y-8">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />

      <PageHeader
        title="Companies"
        description="Manage tenants and invite codes. Enter a company to view their dashboard."
        action={
          <Button onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Create company
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-700">Filter company</label>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="input max-w-[220px]"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">All companies</h3>
            <p className="text-sm text-gray-600">{companies.length} companies</p>
          </div>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : companies.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No companies yet. Create one to get started.</p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              Create company
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={companyFilter ? companies.filter((c) => c.id === companyFilter) : companies}
          />
        )}
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            className="card max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create company</h3>
            <form onSubmit={handleCreateCompany}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="input w-full mb-6"
                placeholder="Acme Ltd"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || !createName.trim()}>
                  {creating ? "Creating…" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !updating && setEditModal(null)}
        >
          <div
            className="card max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Edit company</h3>
            <form onSubmit={handleUpdateCompany}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="input w-full mb-6"
                placeholder="Company name"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={() => setEditModal(null)} disabled={updating}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating || !editName.trim()}>
                  {updating ? "Saving…" : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
