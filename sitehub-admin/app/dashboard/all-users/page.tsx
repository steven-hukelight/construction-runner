"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import PageHeader from "../components/PageHeader";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import Link from "next/link";
import { Users, UserCog, Building2, Trash2, KeyRound, MoreHorizontal, CheckCircle, Circle, User } from "lucide-react";

const ROLES = ["ADMIN", "SUPERVISOR", "VIEWER", "OPERATIVE"] as const;

type UserRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  company_id?: string | null;
  companyId?: string | null;
  lastLogin?: string | null;
  approved?: boolean;
  phone?: string | null;
  avatar?: string | null;
};

type Company = { id: string; name: string | null };

export default function AllUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleModal, setRoleModal] = useState<{ user: UserRow } | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [companyModal, setCompanyModal] = useState<{ user: UserRow } | null>(null);
  const [newCompanyId, setNewCompanyId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [resetSentId, setResetSentId] = useState<string | null>(null);
  const [actionsOpenId, setActionsOpenId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; left: number } | null>(null);

  const companyMap = companies.reduce<Record<string, string>>((acc, c) => {
    acc[c.id] = c.name ?? c.id;
    return acc;
  }, {});

  function loadUsers() {
    setLoading(true);
    fetch("/api/users?all=true", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((data) => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setCompanies([]));
  }, []);

  async function handleChangeRole() {
    if (!roleModal || !newRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${roleModal.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole, email: roleModal.user.email }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === roleModal.user.id ? { ...u, role: newRole } : u))
        );
        setRoleModal(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update role");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleMoveToCompany() {
    if (!companyModal) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${companyModal.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_id: newCompanyId || null, email: companyModal.user.email }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === companyModal.user.id ? { ...u, company_id: newCompanyId || null, companyId: newCompanyId || null } : u
          )
        );
        setCompanyModal(null);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update company");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleApproved(user: UserRow) {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !user.approved, email: user.email }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, approved: !u.approved } : u))
        );
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPasswordReset(user: UserRow) {
    const email = user.email;
    if (!email) {
      alert("User has no email.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResetSentId(user.id);
        setTimeout(() => setResetSentId(null), 3000);
      } else {
        alert(data.error || "Failed to send reset email");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserRow) {
    if (!window.confirm(`Remove user ${user.email ?? user.id}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      }
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { header: "Name", accessor: "name", render: (row: UserRow) => row.name || "—" },
    { header: "Email", accessor: "email", render: (row: UserRow) => row.email || "—" },
    {
      header: "Role",
      accessor: "role",
      render: (row: UserRow) => (
        <span className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
          {row.role || "—"}
        </span>
      ),
    },
    { header: "Company", accessor: "company_id", render: (row: UserRow) => { const cid = row.company_id ?? row.companyId; return cid ? (companyMap[cid] ?? cid) : "—"; } },
    {
      header: "Last login",
      accessor: "lastLogin",
      render: (row: UserRow) =>
        row.lastLogin ? new Date(row.lastLogin).toLocaleString() : "—",
    },
    {
      header: "Profile",
      accessor: "profile",
      render: (row: UserRow) => {
        const hasPhoneOrAvatar = !!(row.phone?.trim?.() || row.avatar?.trim?.());
        return (
          <Link
            href={`/dashboard/users/${row.id}`}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:underline"
            title="View profile"
          >
            {hasPhoneOrAvatar ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
            ) : (
              <Circle className="w-4 h-4 text-gray-300 shrink-0" aria-hidden />
            )}
            <span className="text-xs">{hasPhoneOrAvatar ? "Complete" : "Blank"}</span>
          </Link>
        );
      },
    },
    {
      header: "Status",
      accessor: "approved",
      render: (row: UserRow) => (
        <button
          type="button"
          onClick={() => handleToggleApproved(row)}
          disabled={saving}
          className="inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          style={
            row.approved !== false
              ? { background: "rgb(240 253 244)", color: "rgb(21 128 61)", borderColor: "rgb(187 247 208)" }
              : { background: "rgb(255 251 235)", color: "rgb(180 83 9)", borderColor: "rgb(254 215 170)" }
          }
        >
          {row.approved !== false ? "Approved" : "Pending"}
        </button>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: UserRow) => (
        <div className="relative">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              const target = e.currentTarget;
              const rect = target.getBoundingClientRect();
              if (actionsOpenId === row.id) {
                setActionsOpenId(null);
                setMenuAnchor(null);
              } else {
                setMenuAnchor({ top: rect.bottom, left: rect.left });
                setActionsOpenId(row.id);
              }
            }}
            disabled={saving}
            className="inline-flex items-center gap-1"
            title="Actions"
          >
            <MoreHorizontal className="w-4 h-4" />
            Actions
          </Button>
          {actionsOpenId === row.id && menuAnchor && typeof document !== "undefined" &&
            createPortal(
              <>
                <div className="fixed inset-0 z-40" onClick={() => { setActionsOpenId(null); setMenuAnchor(null); }} aria-hidden />
                <div
                  className="fixed z-50 min-w-[180px] py-1 bg-white border border-gray-200 rounded-lg shadow-lg"
                  style={{
                    bottom: `${window.innerHeight - menuAnchor.top + 8}px`,
                    left: menuAnchor.left,
                  }}
                >
                  <Link
                    href={`/dashboard/users/${row.id}`}
                    onClick={() => { setActionsOpenId(null); setMenuAnchor(null); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100"
                  >
                    <User className="w-3.5 h-3.5" /> View profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => { setRoleModal({ user: row }); setNewRole(row.role || "VIEWER"); setActionsOpenId(null); setMenuAnchor(null); }}
                    disabled={saving}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100"
                  >
                    <UserCog className="w-3.5 h-3.5" /> Change role
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCompanyModal({ user: row }); setNewCompanyId((row.company_id ?? row.companyId) || ""); setActionsOpenId(null); setMenuAnchor(null); }}
                    disabled={saving}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100"
                  >
                    <Building2 className="w-3.5 h-3.5" /> Move to company
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleSendPasswordReset(row); setActionsOpenId(null); setMenuAnchor(null); }}
                    disabled={saving || !row.email}
                    title={!row.email ? "No email" : undefined}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> {resetSentId === row.id ? "Sent" : "Send reset email"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleDelete(row); setActionsOpenId(null); setMenuAnchor(null); }}
                    disabled={saving}
                    className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>,
              document.body
            )
          }
        </div>
      ),
    },
  ];

  return (
    <div className="relative space-y-8">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />

      <PageHeader
        title="All users"
        description="View and manage users across all companies."
      />

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-200/40">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">All users</h3>
            <p className="text-sm text-gray-600">{users.length} users</p>
          </div>
        </div>
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No users found.</p>
          </div>
        ) : (
          <Table columns={columns} data={users} density="comfortable" />
        )}
      </div>

      {roleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !saving && setRoleModal(null)}
        >
          <div
            className="card max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Change role</h3>
            <p className="text-sm text-gray-600 mb-4">{roleModal.user.email}</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="input w-full mb-6"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setRoleModal(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleChangeRole} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {companyModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !saving && setCompanyModal(null)}
        >
          <div
            className="card max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Move to company</h3>
            <p className="text-sm text-gray-600 mb-4">{companyModal.user.email}</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
            <select
              value={newCompanyId}
              onChange={(e) => setNewCompanyId(e.target.value)}
              className="input w-full mb-6"
            >
              <option value="">— No company —</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setCompanyModal(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleMoveToCompany} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
