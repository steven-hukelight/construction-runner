"use client";
import toast from "react-hot-toast";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Table from "../components/ui/Table";
import { initialsFromLabel, TableNameCell } from "../components/ui/TableChrome";
import TableActions, { type TableActionItem } from "../components/ui/TableActions";
import { HeartPulse, Mail, MapPin, Trash2, User } from "lucide-react";
import RoleBadge from "../components/RoleBadge";
import { updateUserRole, deleteUser } from "./actions";
import { supabase } from "@/supabase/auth/client";
import { getCompanyIdFromClient } from "@/lib/utils/cookies";
import { canAssignSuperAdminRole, roleDisplayName, usesAssignedSites } from "@/lib/auth/roles";
import { rolePrivilege, roleStyleKey } from "@/lib/ui/roleStyles";

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

export default function UsersTable({ data, currentUserRole }: UsersTableProps) {
  const [rows, setRows] = useState<UserRow[]>(data ?? []);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(false);
  const reloadUsersRef = useRef<(() => void) | null>(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [roleSort, setRoleSort] = useState<"high" | "low" | null>(null);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [assignSitesFor, setAssignSitesFor] = useState<UserRow | null>(null);
  const [companySites, setCompanySites] = useState<{ id: string; name: string }[]>([]);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [savingSites, setSavingSites] = useState(false);
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
    let cancelled = false;
    const companyId = getCompanyIdFromClient();

    const run = async () => {
      setUsersLoading(true);
      setUsersError(false);
      const fetchFromApi = async () => {
        const res = await fetch("/api/users", { cache: "no-store", credentials: "include" });
        if (!res.ok) throw new Error("Could not load users");
        const json = await res.json();
        const rowsFromApi = Array.isArray(json) ? (json as UserRow[]) : [];
        if (!cancelled) setRows(mergeCurrentUser(rowsFromApi));
      };

      try {
        if (!companyId) {
          await fetchFromApi();
          return;
        }

        const { data: loaded, error } = await supabase
          .from("users")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        const normalized = (loaded ?? []).map((u: UserRow) => ({
          ...u,
          company_id: u.company_id,
          name: u.name ?? u.display_name ?? u.email ?? "",
        }));
        if (!error && loaded) {
          if (!cancelled) setRows(mergeCurrentUser(normalized));
        } else {
          await fetchFromApi();
        }
      } catch {
        if (!cancelled) setUsersError(true);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    reloadUsersRef.current = () => {
      void run();
    };
    void run();

    if (!companyId) {
      return () => {
        cancelled = true;
      };
    }

    const channel = supabase
      .channel("users-table")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "users", filter: `company_id=eq.${companyId}` },
        () => {
          void run();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [mergeCurrentUser]);

  async function handleRoleChange(id: string, role: string, row?: UserRow) {
    const result = await updateUserRole(id, role);
    if (result.success) {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, role } : r))
      );
      if (usesAssignedSites(role)) {
        await openAssignSites(row ?? { id });
      }
    } else {
      toast.error(result.error ?? "Failed to update role. Please try again.");
    }
  }

  async function openAssignSites(row: UserRow) {
    setAssignSitesFor(row);
    try {
      const [sitesRes, assignedRes] = await Promise.all([
        fetch("/api/sites", { cache: "no-store", credentials: "include" }),
        fetch(`/api/users/${encodeURIComponent(row.id)}/sites`, {
          cache: "no-store",
          credentials: "include",
        }),
      ]);
      const sitesJson = await sitesRes.json().catch(() => []);
      const assignedJson = await assignedRes.json().catch(() => ({ siteIds: [] }));
      const sites = Array.isArray(sitesJson)
        ? sitesJson
            .map((s: { id?: string; name?: string }) => ({
              id: String(s.id ?? ""),
              name: String(s.name ?? s.id ?? ""),
            }))
            .filter((s: { id: string }) => s.id)
        : [];
      setCompanySites(sites);
      setSelectedSiteIds(Array.isArray(assignedJson?.siteIds) ? assignedJson.siteIds.map(String) : []);
    } catch {
      setCompanySites([]);
      setSelectedSiteIds([]);
    }
  }

  async function saveAssignedSites() {
    if (!assignSitesFor) return;
    if (selectedSiteIds.length === 0) {
      toast.error("Tick at least one site. They can be assigned to more than one.");
      return;
    }
    setSavingSites(true);
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(assignSitesFor.id)}/sites`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteIds: selectedSiteIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Could not save site access");
        return;
      }
      setAssignSitesFor(null);
    } catch {
      toast.error("Could not save site access");
    } finally {
      setSavingSites(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    await deleteUser(id);
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  async function handleSendPasswordReset(row: UserRow) {
    if (!row.email) {
      toast.error("User has no email.");
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
        toast.error(data.error || "Failed to send reset email");
        return;
      }
      toast.success("Password reset email sent.");
    } catch {
      toast.error("Failed to send reset email");
    }
  }

  type Column = { header: React.ReactNode; accessor: string; render?: (row: UserRow) => React.ReactNode };

  const columns: Column[] = [
    {
      header: "Name",
      accessor: "name",
      render: (row: UserRow) => {
        const label = row.name || row.email || "—";
        return (
          <TableNameCell
            initials={initialsFromLabel(label)}
            role={row.role}
            label={
              <Link
                href={`/dashboard/users/${row.id}`}
                className="rounded hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {label}
              </Link>
            }
          />
        );
      },
    },
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
      header: (
        <button
          type="button"
          onClick={() => setRoleSort((current) => (current === "high" ? "low" : "high"))}
          className="inline-flex items-center gap-1 font-medium uppercase tracking-[0.04em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Role
          {roleSort === "high" ? " ↓" : roleSort === "low" ? " ↑" : ""}
        </button>
      ),
      accessor: "role",
      render: (row: UserRow) => <RoleBadge role={row.role} />,
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: UserRow) => {
        const roleLower = (currentUserRole ?? "").toLowerCase();
        const canChangeRole = roleLower === "admin" || roleLower === "superuser" || roleLower === "sub_admin";
        const items: TableActionItem[] = [
          { label: "View profile", icon: User, onClick: () => window.location.assign(`/dashboard/users/${row.id}`) },
          { label: "Medical records", icon: HeartPulse, onClick: () => window.location.assign(`/dashboard/operatives/${row.id}`) },
        ];
        if (canChangeRole) {
          if (canAssignSuperAdminRole(currentUserRole)) {
            items.push({
              label: "Super Admin",
              heading: "Set role",
              onClick: () => handleRoleChange(row.id, "admin", row),
            });
          }
          items.push(
            {
              label: "Site Admin",
              heading: canAssignSuperAdminRole(currentUserRole) ? undefined : "Set role",
              onClick: () => handleRoleChange(row.id, "site_admin", row),
            },
            { label: "Supervisor", onClick: () => handleRoleChange(row.id, "supervisor", row) },
            { label: "Operative", onClick: () => handleRoleChange(row.id, "operative", row) }
          );
          if (usesAssignedSites(row.role)) {
            items.push({ label: "Assign sites…", icon: MapPin, divider: true, onClick: () => { void openAssignSites(row); } });
            items.push({ label: "Send reset email", icon: Mail, onClick: () => handleSendPasswordReset(row) });
          } else {
            items.push({ label: "Send reset email", icon: Mail, divider: true, onClick: () => handleSendPasswordReset(row) });
          }
        }
        items.push({ label: "Delete user", icon: Trash2, onClick: () => handleDelete(row.id), variant: "danger" });
        return <TableActions items={items} />;
      },
    },
  ];

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = roleStyleKey(row.role);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => rolePrivilege(a[0]) - rolePrivilege(b[0]));
  }, [rows]);

  const displayedRows = useMemo(() => {
    const filtered =
      roleFilter === "all" ? rows : rows.filter((row) => roleStyleKey(row.role) === roleFilter);
    if (!roleSort) return filtered;
    const direction = roleSort === "high" ? 1 : -1;
    return [...filtered].sort((a, b) => (rolePrivilege(a.role) - rolePrivilege(b.role)) * direction);
  }, [rows, roleFilter, roleSort]);

  return (
    <>
      <Table
        title="All users"
        subtitle={`${displayedRows.length}${roleFilter === "all" ? ` of ${rows.length}` : ""} people`}
        extra={
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by role">
            <button
              type="button"
              onClick={() => setRoleFilter("all")}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                roleFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All {rows.length}
            </button>
            {roleCounts.map(([key, count]) => (
              <button
                key={key}
                type="button"
                onClick={() => setRoleFilter(key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  roleFilter === key
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {roleDisplayName(key)} {count}
              </button>
            ))}
          </div>
        }
        columns={columns}
        data={displayedRows}
        loading={usersLoading && rows.length === 0}
        error={usersError && rows.length === 0}
        onRetry={() => reloadUsersRef.current?.()}
        thing="users"
        things="users"
      />
      {assignSitesFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Assign sites
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {assignSitesFor.email || assignSitesFor.name || "This person"} will only see the sites you tick. Tick as many as they work on.
            </p>
            {companySites.length > 0 && (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  onClick={() => setSelectedSiteIds(companySites.map((s) => s.id))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-slate-500 hover:underline"
                  onClick={() => setSelectedSiteIds([])}
                >
                  Clear
                </button>
              </div>
            )}
            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {companySites.length === 0 && (
                <p className="text-sm text-slate-500">No sites found for this company yet.</p>
              )}
              {companySites.map((site) => {
                const checked = selectedSiteIds.includes(site.id);
                return (
                  <label key={site.id} className="flex items-center gap-2 text-sm text-slate-800 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setSelectedSiteIds((prev) =>
                          e.target.checked
                            ? [...prev, site.id]
                            : prev.filter((id) => id !== site.id)
                        );
                      }}
                    />
                    {site.name}
                  </label>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                onClick={() => setAssignSitesFor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSites}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={() => void saveAssignedSites()}
              >
                {savingSites ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
