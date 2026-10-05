"use client";

import useSWR from "swr";
import { UserRound } from "lucide-react";
import { CardSelect } from "../components/ui/CardSelect";
import { normalizeRole, roleDisplayName } from "@/lib/auth/roles";

const STAFF_ROLES = new Set(["admin", "site_admin", "supervisor", "superuser"]);

type UserLite = {
  id: string;
  name?: string;
  display_name?: string;
  email?: string;
  role?: string;
};

function displayName(u: UserLite) {
  return (u.name || u.display_name || u.email || "User").trim();
}

export function useSiteManagers() {
  const { data } = useSWR<UserLite[]>(
    "/api/users",
    (url: string) =>
      fetch(url, { credentials: "include", cache: "no-store" }).then((r) => (r.ok ? r.json() : [])),
    { revalidateOnFocus: false }
  );
  const users = Array.isArray(data) ? data : [];
  const managers = users.filter((u) => STAFF_ROLES.has(normalizeRole(u.role)));

  function nameFor(id: string | null | undefined) {
    if (!id) return "";
    const u = users.find((x) => x.id === id);
    return u ? displayName(u) : "";
  }

  function optionsFor(currentId?: string | null) {
    const list = [...managers];
    if (currentId && !list.some((m) => m.id === currentId)) {
      const extra = users.find((u) => u.id === currentId);
      if (extra) list.unshift(extra);
    }
    return list;
  }

  return { users, managers, nameFor, optionsFor, loading: data === undefined };
}

export function SiteManagerSelect({
  value,
  onChange,
  disabled,
  variant = "table",
}: {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  variant?: "table" | "form";
}) {
  const { optionsFor, loading } = useSiteManagers();
  const items = optionsFor(value).map((u) => ({
    id: u.id,
    name: displayName(u),
    subtitle: roleDisplayName(u.role),
  }));

  if (variant === "form") {
    return (
      <CardSelect
        items={items}
        value={value}
        onChange={onChange}
        icon={UserRound}
        fieldLabel="Site manager"
        placeholder={loading ? "Loading…" : "Unassigned"}
        allowNone
        noneLabel="Unassigned"
        disabled={disabled || loading}
      />
    );
  }

  return (
    <select
      aria-label="Site manager"
      disabled={disabled || loading}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-[10.5rem] max-w-[10.5rem] rounded-lg border border-gray-300 bg-white px-2.5 text-sm text-gray-900 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
    >
      <option value="">Unassigned</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
  );
}
