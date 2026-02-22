"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Users, CheckCircle, Circle } from "lucide-react";
import Table from "../components/ui/Table";
import TableActions from "../components/ui/TableActions";
import { updateUserRole, deleteUser } from "./actions";
import UserProfileModal from "./UserProfileModal";
import { supabase } from "@/supabase/auth/client";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";

export default function UsersTable({ data, profiles, currentUserRole }: any) {
  const [rows, setRows] = useState<any[]>(data || []);
  const [profileMap, setProfileMap] = useState<Map<string, any>>(new Map());
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [currentCompanyName, setCurrentCompanyName] = useState<string | null>(null);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then((companies) => {
        if (Array.isArray(companies)) {
          const map: Record<string, string> = {};
          companies.forEach((c: any) => {
            if (c.id && c.name) map[c.id] = c.name;
          });
          setCompanyMap(map);
        }
      })
      .catch(() => setCompanyMap({}));
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null);
  const currentUserRef = useRef<any>(null);
  currentUserRef.current = currentUser;

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.ok ? res.json() : {})
      .then((me: any) => {
        if (me?.companyName) setCurrentCompanyName(me.companyName);
        if (me?.company_id ?? me?.companyId) setCurrentCompanyId(me.company_id ?? me.companyId);
        if (me?.id) setCurrentUser(me);
      })
      .catch(() => {});
  }, []);

  const mergeCurrentUser = (rows: any[]) => {
    const me = currentUserRef.current;
    if (!me?.id) return rows;
    const exists = rows.some((r: any) => r.id === me.id || r.email === me.email);
    if (exists) return rows;
    return [{ id: me.id, email: me.email, name: me.name, role: me.role, company_id: me.company_id ?? me.companyId }, ...rows];
  };

  useEffect(() => {
    setRows(mergeCurrentUser(data || []));
  }, [data]);

  useEffect(() => {
    if (!currentUser?.id) return;
    setRows((prev) => mergeCurrentUser(prev));
  }, [currentUser]);

  // Fetch users from Supabase or fall back to API
  useEffect(() => {
    const companyId = getCompanyIdFromClient();
    const fetchFromApi = async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store", credentials: "include" });
        const json = await res.json();
        const rowsFromApi = Array.isArray(json) ? json : [];
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
      const normalized = (data ?? []).map((u: any) => ({
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
  }, []);

  useEffect(() => {
    if (profiles) {
      const map = new Map<string, any>();
      profiles.forEach((p: any) => {
        const key = p.id || p.userId;
        if (key) map.set(key, p);
      });
      setProfileMap(map);
    }
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

  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    {
      header: "Company",
      accessor: "company_id",
      render: (row: any) => {
        const cid = row.company_id ?? row.companyId;
        const name = companyMap[cid] ?? (cid === currentCompanyId ? currentCompanyName : null);
        return name || "—";
      },
    },
    {
      header: "Role",
      accessor: "role",
      render: (row: any) => (
        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-md bg-gray-100 text-gray-800">
          {row.role || "—"}
        </span>
      ),
    },
    {
      header: "Profile",
      accessor: "profile",
      render: (row: any) => {
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
              href={`/dashboard/operatives/${row.id}`}
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
      render: (row: any) => {
        const roleLower = (currentUserRole ?? "").toLowerCase();
        const canChangeRole = roleLower === "admin" || roleLower === "superuser" || roleLower === "sub_admin";
        const items: { label: string; onClick: () => void; variant?: "default" | "danger" }[] = [
          { label: "View profile", onClick: () => window.location.assign(`/dashboard/operatives/${row.id}`) },
        ];
        if (profileMap.get(row.id)) {
          items.push({ label: "Edit profile", onClick: () => setSelectedProfile(profileMap.get(row.id)) });
        }
        if (canChangeRole) {
          items.push(
            { label: "Set role → Admin", onClick: () => handleRoleChange(row.id, "ADMIN") },
            { label: "Set role → Supervisor", onClick: () => handleRoleChange(row.id, "SUPERVISOR") },
            { label: "Set role → Operative", onClick: () => handleRoleChange(row.id, "OPERATIVE") }
          );
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
          <div className="p-2 rounded-lg bg-blue-100">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">All Users</h3>
            <p className="text-sm text-slate-600">{rows.length} users registered</p>
          </div>
        </div>
        <Table columns={columns} data={rows} density="comfortable" />
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
