"use client";
import toast from "react-hot-toast";

import { useEffect, useMemo, useState } from "react";
import Table from "../components/ui/Table";
import RoleBadge from "../components/RoleBadge";
import Button from "../components/ui/Button";
import Link from "next/link";
import { Building2, Trash2, KeyRound, CheckCircle, Circle, User } from "lucide-react";
import { CompanyPicker } from "../components/ui/SitePicker";
import Modal from "../components/ui/Modal";
import { assignableStaffRoles, roleDisplayName } from "@/lib/auth/roles";
import TableActions, { type TableActionItem } from "../components/ui/TableActions";

const ROLE_OPTIONS = [
  ...assignableStaffRoles("superuser"),
  { value: "VIEWER", label: "Viewer" },
];

function roleKey(role: string | null | undefined): string {
  return (role ?? "").trim().toUpperCase();
}

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
  const [companyModal, setCompanyModal] = useState<{ user: UserRow } | null>(null);
  const [newCompanyId, setNewCompanyId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [resetSentId, setResetSentId] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [query, setQuery] = useState("");

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

  async function handleChangeRole(user: UserRow, nextRole: string) {
    if (roleKey(user.role) === nextRole) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: nextRole, email: user.email }),
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u)));
        toast.success(`Role set to ${roleDisplayName(nextRole)}`);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update role");
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
        toast.error(err.error || "Failed to update company");
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
        toast.error(err.error || "Failed to update");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSendPasswordReset(user: UserRow) {
    const email = user.email;
    if (!email) {
      toast.error("User has no email.");
      return;
    }
    setSaving(true);
    let provData: { ok?: boolean; userId?: string; error?: string } | undefined;
    try {
      let res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, userId: user.id }),
      });
      let data = await res.json().catch(() => ({}));
      if (!res.ok && (data.error ?? "").includes("not found in authentication")) {
        const provRes = await fetch("/api/auth/provision-legacy-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
          credentials: "include",
        });
        provData = await provRes.json().catch(() => ({}));
        if (!provRes.ok || !provData?.ok) {
          toast.error(provData?.error || "Provision failed");
          return;
        }
        const newId = provData.userId ?? user.id;
        loadUsers();
        res = await fetch("/api/auth/send-password-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, userId: newId }),
        });
        data = await res.json().catch(() => ({}));
      }
      if (res.ok) {
        const resetId = data.userId ?? provData?.userId ?? user.id;
        setResetSentId(resetId);
        setTimeout(() => setResetSentId(null), 3000);
      } else {
        toast.error(data.error || "Failed to send reset email");
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
        toast.error(err.error || "Failed to delete");
      }
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      header: "Name",
      accessor: "name",
      render: (row: UserRow) => {
        const label = row.name || row.email || "—";
        return (
          <Link
            href={`/dashboard/users/${row.id}`}
            className="table-link whitespace-nowrap"
          >
            {label}
          </Link>
        );
      },
    },
    { header: "Email", accessor: "email", render: (row: UserRow) => row.email || "—" },
    {
      header: "Role",
      accessor: "role",
      render: (row: UserRow) => <RoleBadge role={row.role} />,
    },
    {
      header: "Company",
      accessor: "company_id",
      render: (row: UserRow) => {
        const cid = row.company_id ?? row.companyId;
        return cid ? (companyMap[cid] ?? cid) : "—";
      },
    },
    {
      header: "Profile",
      accessor: "profile",
      render: (row: UserRow) => {
        const hasPhoneOrAvatar = !!(row.phone?.trim?.() || row.avatar?.trim?.());
        return (
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            {hasPhoneOrAvatar ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
            ) : (
              <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" aria-hidden />
            )}
            {hasPhoneOrAvatar ? "Complete" : "Blank"}
          </span>
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
      render: (row: UserRow) => {
        const current = roleKey(row.role);
        const items: TableActionItem[] = [
          {
            label: "View profile",
            icon: User,
            onClick: () => window.location.assign(`/dashboard/users/${row.id}`),
          },
          ...ROLE_OPTIONS.map((opt, i) => ({
            label: current === opt.value ? `${opt.label} (current)` : opt.label,
            heading: i === 0 ? `Set role · currently ${roleDisplayName(row.role)}` : undefined,
            onClick: () => void handleChangeRole(row, opt.value),
          })),
          {
            label: "Move to company",
            icon: Building2,
            divider: true,
            onClick: () => {
              setCompanyModal({ user: row });
              setNewCompanyId((row.company_id ?? row.companyId) || "");
            },
          },
          {
            label: resetSentId === row.id ? "Sent" : "Send reset email",
            icon: KeyRound,
            onClick: () => void handleSendPasswordReset(row),
          },
          {
            label: "Delete user",
            icon: Trash2,
            variant: "danger" as const,
            onClick: () => void handleDelete(row),
          },
        ];
        return <TableActions items={items} />;
      },
    },
  ];

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const cid = u.company_id ?? u.companyId;
      if (companyFilter && cid !== companyFilter) return false;
      if (!q) return true;
      const hay = `${u.name ?? ""} ${u.email ?? ""} ${companyMap[cid ?? ""] ?? cid ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [users, companyFilter, query, companyMap]);

  return (
    <div className="relative">
      <Table
        density="compact"
        title="All users"
        subtitle={loading ? "Loading…" : `${visibleUsers.length}${visibleUsers.length !== users.length ? ` of ${users.length}` : ""} users`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className="table-toolbar-input w-52"
              aria-label="Search users"
            />
            <CompanyPicker
              companies={companies}
              value={companyFilter}
              onChange={setCompanyFilter}
              variant="compact"
              allowNone
              noneValue=""
              noneLabel="All companies"
              placeholder="All companies"
              className="w-52"
            />
          </div>
        }
        columns={columns}
        data={visibleUsers}
        loading={loading}
        emptyMessage="No users found."
        thing="users"
        things="users"
      />

      <Modal
        open={!!companyModal}
        onClose={() => {
          if (!saving) setCompanyModal(null);
        }}
        title="Move to company"
      >
        {companyModal ? (
          <>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{companyModal.user.email}</p>
            <CompanyPicker
              companies={companies}
              value={newCompanyId}
              onChange={setNewCompanyId}
              allowNone
              noneValue=""
              noneLabel="— No company —"
              className="mb-6"
            />
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="secondary" onClick={() => setCompanyModal(null)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleMoveToCompany} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}
