"use client";
import toast from "react-hot-toast";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import Table from "../components/ui/Table";
import TableActions from "../components/ui/TableActions";
import Button from "../components/ui/Button";
import useSWR from "swr";
import AddSiteForm from "./AddSiteForm";
import { SiteManagerSelect, useSiteManagers } from "./SiteManagerSelect";

function siteIsVisible(row: { showOnMap?: boolean; show_on_map?: boolean } | null | undefined) {
  if (!row) return true;
  if (row.showOnMap === false || row.show_on_map === false) return false;
  return true;
}

function siteIsActive(row: { active?: boolean } | null | undefined) {
  return row?.active !== false;
}

function managerIdOf(row: { managerId?: string | null; manager_id?: string | null }) {
  return String(row.managerId ?? row.manager_id ?? "");
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SitesTable({
  data,
  canCreate = false,
  canAssignManager = false,
}: {
  data: any;
  canCreate?: boolean;
  canAssignManager?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const { nameFor } = useSiteManagers();
  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store", credentials: "include" }).then((r) =>
      r.ok ? r.json() : []
    );

  const { data: rows, mutate } = useSWR<any[]>("/api/sites", fetcher, {
    fallbackData: Array.isArray(data) ? data : [],
    refreshInterval: 30000,
    revalidateOnMount: true,
  });

  const rowsSafe = rows ?? [];

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this site?")) return;
    try {
      const res = await fetch(`/api/sites?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        let message = "Failed to delete site";
        try {
          const j = (await res.json()) as { error?: string };
          if (typeof j?.error === "string" && j.error) message = j.error;
        } catch {
          /* ignore */
        }
        toast.error(message);
        await mutate();
        return;
      }
      mutate((prev) => (prev ?? []).filter((row) => row.id !== id), false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not delete site";
      toast.error(msg);
      await mutate();
    }
  }

  async function patchSite(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/sites/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let message = "Could not update site";
      try {
        const j = (await res.json()) as { error?: string };
        if (typeof j?.error === "string" && j.error) message = j.error;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }
    return (await res.json().catch(() => null)) as { site?: Record<string, unknown> } | null;
  }

  async function toggleVisible(row: any) {
    const next = !siteIsVisible(row);
    try {
      const payload = await patchSite(row.id, { showOnMap: next });
      mutate(
        (prev) =>
          (prev ?? []).map((r) =>
            r.id === row.id
              ? payload?.site
                ? { ...r, ...payload.site }
                : { ...r, showOnMap: next, show_on_map: next }
              : r
          ),
        { revalidate: true }
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error while saving.");
      await mutate();
    }
  }

  async function toggleActive(row: any) {
    const next = !(row.active ?? true);
    try {
      await patchSite(row.id, { active: next });
      mutate(
        (prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, active: next } : r)),
        false
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Network error while saving.");
      await mutate();
    }
  }

  async function assignManager(row: any, nextId: string) {
    const previous = managerIdOf(row);
    mutate(
      (prev) =>
        (prev ?? []).map((r) =>
          r.id === row.id ? { ...r, managerId: nextId || null, manager_id: nextId || null } : r
        ),
      false
    );
    try {
      const payload = await patchSite(row.id, { managerId: nextId || null });
      if (payload?.site) {
        mutate(
          (prev) => (prev ?? []).map((r) => (r.id === row.id ? { ...r, ...payload.site } : r)),
          false
        );
      }
    } catch (e) {
      mutate(
        (prev) =>
          (prev ?? []).map((r) =>
            r.id === row.id ? { ...r, managerId: previous || null, manager_id: previous || null } : r
          ),
        false
      );
      toast.error(e instanceof Error ? e.message : "Could not save manager.");
    }
  }

  const columns = [
    {
      header: "Name",
      accessor: "name",
      render: (row: any) => (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
            <MapPin className="h-4 w-4" aria-hidden />
          </span>
          <span className="truncate font-semibold text-slate-900 dark:text-slate-100">
            {row.name || "Untitled site"}
          </span>
        </div>
      ),
    },
    {
      header: "Manager",
      accessor: "managerId",
      render: (row: any) => {
        const current = managerIdOf(row);
        if (!canAssignManager) {
          return <span className="text-sm font-medium text-slate-800">{nameFor(current) || "—"}</span>;
        }
        return (
          <SiteManagerSelect
            value={current}
            onChange={(id) => {
              void assignManager(row, id);
            }}
          />
        );
      },
    },
    {
      header: "Active",
      accessor: "active",
      render: (row: any) => (
        <span className={`status-chip ${siteIsActive(row) ? "status-chip--ok" : "status-chip--muted"}`}>
          {siteIsActive(row) ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Visible",
      accessor: "showOnMap",
      render: (row: any) => (
        <span className={`status-chip ${siteIsVisible(row) ? "status-chip--info" : "status-chip--muted"}`}>
          {siteIsVisible(row) ? "Shown" : "Hidden"}
        </span>
      ),
    },
    {
      header: "Location",
      accessor: "location",
      render: (row: any) => {
        const loc = row.location || {};
        let primary = "";
        if (loc.address) primary = loc.address;
        else if (typeof loc.lat === "number" && typeof loc.lng === "number") {
          primary = `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        } else {
          const lat = row.latitude ?? loc.lat;
          const lng = row.longitude ?? loc.lng;
          if (lat != null && lng != null) primary = `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
        }
        const gf = row.geofence || {};
        const parts: string[] = [];
        const radius = gf.radiusMeters ?? row.radius_meters;
        if (radius != null && typeof Number(radius) === "number" && !isNaN(Number(radius))) {
          parts.push(`${Number(radius)}m`);
        }
        if (Array.isArray(gf.polygon) && gf.polygon.length >= 3) {
          parts.push(`Fence ${gf.polygon.length} pts`);
        }
        return (
          <div className="max-w-[14rem]">
            <div className="table-cell-muted line-clamp-2">{primary || "—"}</div>
            {parts.length ? <div className="mt-0.5 text-xs text-slate-400">{parts.join(" · ")}</div> : null}
          </div>
        );
      },
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: any) => (
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/sites/${row.id}`} className="table-link">
            Manage
          </Link>
          <TableActions
            items={[
              { label: "View map", onClick: () => window.location.assign(`/dashboard/sites/${row.id}`) },
              { label: "Toggle visible", onClick: () => toggleVisible(row) },
              { label: "Toggle active", onClick: () => toggleActive(row) },
              { label: "Delete site", onClick: () => handleDelete(row.id), variant: "danger" },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={rowsSafe}
      emptyMessage="No sites yet. Add a location to get started."
      title="All sites"
      subtitle={`${rowsSafe.length} location${rowsSafe.length === 1 ? "" : "s"}`}
      actions={
        canCreate ? (
          <Button type="button" size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? "Close" : "Add Site"}
          </Button>
        ) : null
      }
      extra={
        adding && canCreate ? (
          <AddSiteForm
            onCancel={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              void mutate();
            }}
          />
        ) : null
      }
    />
  );
}
