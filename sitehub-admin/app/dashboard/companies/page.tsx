"use client";
import toast from "react-hot-toast";

import { useEffect, useState } from "react";
import { formatDate } from "@/app/DisplayPreferencesProvider";
import PageHeader from "../components/PageHeader";
import { PortalOverlay } from "../components/PortalOverlay";
import Table from "../components/ui/Table";
import { TableNameCell } from "../components/ui/TableChrome";
import Button from "../components/ui/Button";
import TableActions from "../components/ui/TableActions";
import { getRoleFromClient } from "@/lib/utils/cookies";
import { Archive, Ban, Building2, LayoutDashboard, Pencil, Plus, Copy, Check, RefreshCw, Trash2 } from "lucide-react";
import { CompanyPicker } from "../components/ui/SitePicker";

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
  const [createRequesteeName, setCreateRequesteeName] = useState("");
  const [createName, setCreateName] = useState("");
  const [createContactEmail, setCreateContactEmail] = useState("");
  const [createAddress, setCreateAddress] = useState("");
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
    if (role === "superuser") {
      const res = await fetch("/api/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
        credentials: "include",
      });
      if (!res.ok) return;
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
        toast.error(err.error || "Failed to update");
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
        toast.error(err.error || "Failed to update");
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
        toast.error(err.error || "Failed to delete");
      }
    } finally {
    }
  }

  function resetCreateForm() {
    setCreateRequesteeName("");
    setCreateName("");
    setCreateContactEmail("");
    setCreateAddress("");
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    const requesteeName = createRequesteeName.trim();
    const name = createName.trim();
    const contactEmail = createContactEmail.trim();
    const address = createAddress.trim();
    if (!requesteeName || !name || !contactEmail || !address) return;
    setCreating(true);
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requesteeName,
          name,
          contactEmail,
          address,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        resetCreateForm();
        setCreateOpen(false);
        loadCompanies();
        if (typeof data?.message === "string") {
          toast.success(data.message);
        }
      } else {
        toast.error(typeof data?.error === "string" ? data.error : "Failed to create company");
      }
    } finally {
      setCreating(false);
    }
  }

  const createFormValid =
    !!createRequesteeName.trim() &&
    !!createName.trim() &&
    !!createContactEmail.trim() &&
    !!createAddress.trim();

  const columns = [
    { header: "Name", accessor: "name", render: (row: Company) => <TableNameCell icon={Building2} label={row.name || "—"} /> },
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
        row.createdAt ? formatDate(row.createdAt) : "—",
    },
    {
      header: "Status",
      accessor: "status",
      render: (row: Company) => (
        <span
          className={`status-chip ${
            row.status === "Active"
              ? "status-chip--ok"
              : row.status === "Archived"
                ? "status-chip--muted"
                : "status-chip--info"
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
          { label: "Enter dashboard", icon: LayoutDashboard, onClick: () => handleEnterDashboard(row.id) },
          {
            label: regeneratingId === row.id ? "Regenerating…" : "Regenerate invite code",
            icon: RefreshCw,
            onClick: () => handleRegenerateInviteCode(row.id),
          },
          {
            label: "Edit name",
            icon: Pencil,
            onClick: () => {
              setEditModal(row);
              setEditName(row.name || "");
            },
          },
          ...(row.status !== "Disabled" ? [{ label: "Disable", icon: Ban, onClick: () => handleSetStatus(row.id, "Disabled") }] : []),
          ...(row.status !== "Archived" ? [{ label: "Archive", icon: Archive, onClick: () => handleSetStatus(row.id, "Archived") }] : []),
          {
            label: "Delete company",
            icon: Trash2,
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

      <div className="w-64 mb-4">
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

      <Table
        title="All companies"
        subtitle={`${companies.length} companies`}
        columns={columns}
        data={loading ? [] : companyFilter ? companies.filter((c) => c.id === companyFilter) : companies}
        emptyMessage={loading ? "Loading…" : "No companies yet. Create one to get started."}
      />

      {createOpen && (
        <PortalOverlay>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => !creating && setCreateOpen(false)}
          >
            <div
              className="card max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold text-gray-900 mb-1">Create company</h3>
              <p className="text-sm text-gray-600 mb-4">
                Creates the tenant, adds the contact as company admin, and emails them a temporary password to sign in
                (if outbound email is configured).
              </p>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requestee name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={createRequesteeName}
                    onChange={(e) => setCreateRequesteeName(e.target.value)}
                    className="input w-full"
                    placeholder="Person responsible for onboarding"
                    autoFocus
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company name <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="input w-full"
                    placeholder="Acme Ltd"
                    autoComplete="organization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Access email <span className="text-red-600">*</span>
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    This person receives the login email with a temporary password. They must use this address to sign in.
                  </p>
                  <input
                    type="email"
                    value={createContactEmail}
                    onChange={(e) => setCreateContactEmail(e.target.value)}
                    className="input w-full"
                    placeholder="admin@company.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company address <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={createAddress}
                    onChange={(e) => setCreateAddress(e.target.value)}
                    className="input w-full min-h-[88px] py-2.5 resize-y"
                    placeholder="Registered or principal address, building, street, town, postcode, country"
                    rows={3}
                    autoComplete="street-address"
                  />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      resetCreateForm();
                      setCreateOpen(false);
                    }}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || !createFormValid}>
                    {creating ? "Creating…" : "Create company"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </PortalOverlay>
      )}

      {editModal && (
        <PortalOverlay>
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
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
        </PortalOverlay>
      )}
    </div>
  );
}
