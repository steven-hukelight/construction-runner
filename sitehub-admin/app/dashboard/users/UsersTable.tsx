"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Users, CheckCircle, Circle } from "lucide-react";
import Table from "../components/ui/Table";
import TableActions from "../components/ui/TableActions";
import RoleBadge from "../components/RoleBadge";
import { updateUserRole, deleteUser } from "./actions";
import UserProfileModal from "./UserProfileModal";
import { supabase } from "@/supabase/auth/client";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

type UserRow = {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  company_id?: string;
  companyId?: string;
  display_name?: string;
};

type Profile = {
  id?: string;
  userId?: string;
  phone?: string;
  avatar?: string;
};

type UsersTableProps = {
  data?: UserRow[];
  profiles?: Profile[];
  currentUserRole?: string;
};

type MeResponse = {
  id?: string;
  companyName?: string;
  company_id?: string;
  companyId?: string;
  email?: string;
  name?: string;
  role?: string;
};

export default function UsersTable({ data, profiles, currentUserRole }: UsersTableProps) {
  const [rows, setRows] = useState<UserRow[]>(data ?? []);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [currentCompanyName, setCurrentCompanyName] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((companies) => {
        if (Array.isArray(companies)) {
          const map: Record<string, string> = {};
          companies.forEach((c: { id?: string; name?: string }) => {
            if (c.id && c.name) map[c.id] = c.name;
          });
          setCompanyMap(map);
        }
      })
      .catch(() => setCompanyMap({}));
  }, []);

  const [currentUser, setCurrentUser] = useState<MeResponse | null>(null);
  const currentUserRef = useRef<MeResponse | null>(null);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : {}))
      .then((me: MeResponse) => {
        if (me?.companyName) setCurrentCompanyName(me.companyName);
        if (me?.company_id ?? me?.companyId) setCurrentCompanyId(me.company_id ?? me.companyId ?? null);
        if (me?.id) setCurrentUser(me);
      })
      .catch(() => {});
  }, []);

  const mergeCurrentUser = useCallback((incomingRows: UserRow[]) => {
    const me = currentUserRef.current;
    if (!me?.id) return incomingRows;
    const exists = incomingRows.some((r: UserRow) => r.id === me.id || r.email === me.email);
    if (exists) return incomingRows;
    return [
      { id: me.id, email: me.email, name: me.name, role: me.role, company_id: me.company_id ?? me.companyId },
      ...incomingRows,
    ];
  }, []);

  // Sync rows when data prop or currentUser changes (consolidated to avoid race/duplicate updates)
  useEffect(() => {
    queueMicrotask(() => {
      if (data !== undefined) {
        setRows(mergeCurrentUser(data));
      } else if (currentUser?.id) {
        setRows((prev) => mergeCurrentUser(prev));
      }
    });
  }, [data, currentUser?.id, mergeCurrentUser]);

  // Fetch users from Supabase or fall back to API
  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    const fetchFromApi = async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store", credentials: "include" });
        const json = await res.json();
        const rowsFromApi = Array.isArray(json) ? (json as UserRow[]) : [];
        setRows(mergeCurrentUser(rowsFromApi));
      } catch {
        /* keep existing rows */
      }
    };

    if (!companyId) {
      fetchFromApi();
      return undefined;
    }

    const loadUsers = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      const normalized = (data ?? []).map((u: UserRow) => ({
        ...u,
        company_id: u.company_id,
        name: u.name ?? u.display_name ?? u.email ?? "",
      }));
      if (!error && data) setRows(mergeCurrentUser(normalized));
      else fetchFromApi();
    };

    loadUsers();

    const channel = supabase
      .channel("users-table")
      .on("postgres_changes", { event: "*", schema: "public", table: "users", filter: `company_id=eq.${companyId}` }, loadUsers)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mergeCurrentUser]);

  const profileMap = useMemo(() => {
    const map = new Map<string, Profile>();
    (profiles ?? []).forEach((p: Profile) => {
      const key = p.id || p.userId;
      if (key) map.set(key, p);
    });
    return map;
  }, [profiles]);

  async function handleRoleChange(id: string, role: string) {
    const result = await updateUserRole(id, role);
    if (result.success) {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, role } : row))
      );
    } else {
      alert(result.error ?? "Failed to update role. Please try again.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    await deleteUser(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  async function handleSendPasswordReset(row: UserRow) {
    if (!row.email) {
      alert("User has no email.");
      return;
    }
    try {
      const res = await fetch("/api/auth/send-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: row.email, userId: row.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to send reset email");
        return;
      }
      alert("Password reset email sent.");
    } catch {
      alert("Failed to send reset email");
    }
  }

  type Column = { header: string; accessor: string; render?: (row: UserRow) => React.ReactNode };

  const columns: Column[] = [
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    {
      header: "Company",
      accessor: "company_id",
      render: (row: UserRow) => {
        const cid = row.company_id ?? row.companyId;
        const name = cid ? companyMap[cid] ?? (cid === currentCompanyId ? currentCompanyName : null) : null;
        return name || "—";
      },
    },
    {
      header: "Role",
      accessor: "role",
      render: (row: UserRow) => <RoleBadge role={row.role} />,
    },
    {
      header: "Profile",
      accessor: "profile",
      render: (row: UserRow) => {
        const profile = profileMap.get(row.id);
        const hasPhoneOrAvatar = profile && (profile.phone?.trim?.() || profile.avatar?.trim?.());
        return (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5" title={hasPhoneOrAvatar ? "Profile completed" : "Blank"}>
              {hasPhoneOrAvatar ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden />
              ) : (
                <Circle className="w-4 h-4 text-gray-300 shrink-0" aria-hidden />
              )}
              <span className="text-xs text-gray-600">{hasPhoneOrAvatar ? "Complete" : "Blank"}</span>
            </span>
            <Link
              href={`/dashboard/users/${row.id}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium underline"
            >
              View profile
            </Link>
            {profile && (
              <button
                type="button"
                onClick={() => setSelectedProfile(profile)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Edit
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: UserRow) => {
        const roleLower = (currentUserRole ?? "").toLowerCase();
        const canChangeRole = roleLower === "admin" || roleLower === "superuser" || roleLower === "sub_admin";
        const items: { label: string; onClick: () => void; variant?: "default" | "danger" }[] = [
          { label: "View profile", onClick: () => window.location.assign(`/dashboard/users/${row.id}`) },
        ];
        if (profileMap.get(row.id)) {
          items.push({ label: "Edit profile", onClick: () => setSelectedProfile(profileMap.get(row.id) ?? null) });
        }
        if (canChangeRole) {
          items.push(
            { label: "Set role → Admin", onClick: () => handleRoleChange(row.id, "ADMIN") },
            { label: "Set role → Supervisor", onClick: () => handleRoleChange(row.id, "SUPERVISOR") },
            { label: "Set role → Operative", onClick: () => handleRoleChange(row.id, "OPERATIVE") }
          );
          items.push({ label: "Send reset email", onClick: () => handleSendPasswordReset(row) });
        }
        items.push({ label: "Delete user", onClick: () => handleDelete(row.id), variant: "danger" });
        return <TableActions items={items} />;
      },
    },
  ];

  return (
    <>
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Users</h3>
            <p className="text-sm text-slate-600">{rows.length} users registered</p>
          </div>
        </div>
        <Table columns={columns} data={rows} />
      </div>
      {selectedProfile && (
        <UserProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onUpdate={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
