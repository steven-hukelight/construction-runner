"use client";

import Link from "next/link";
import { Database } from "lucide-react";
import Table from "../components/ui/Table";
import TableActions from "../components/ui/TableActions";
import { deleteSite, updateSite } from "./actions";
import useSWR from "swr";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function SitesTable({ data }: any) {
  const fetcher = (url: string) =>
    fetch(url, { cache: "no-store", credentials: "include" }).then((r) =>
      r.ok ? r.json() : []
    );

  const { data: rows, mutate } = useSWR<any[]>("/api/sites", fetcher, {
    fallbackData: Array.isArray(data) ? data : [],
    refreshInterval: 30000,
  });

  const rowsSafe = rows ?? [];

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this site?")) return;
    await deleteSite(id);
    mutate((prev) => (prev ?? []).filter((row) => row.id !== id), false);
  }

  async function toggleVisible(row: any) {
    const next = !(row.showOnMap ?? true);
    await updateSite(row.id, { showOnMap: next });
    mutate(
      (prev) =>
        (prev ?? []).map((r) => (r.id === row.id ? { ...r, showOnMap: next } : r)),
      false
    );
  }

  async function toggleActive(row: any) {
    const next = !(row.active ?? true);
    await updateSite(row.id, { active: next });
    mutate(
      (prev) =>
        (prev ?? []).map((r) => (r.id === row.id ? { ...r, active: next } : r)),
      false
    );
  }

  const columns = [
    { header: "Name", accessor: "name" },
    {
      header: "Active",
      accessor: "active",
      render: (row: any) => (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${row.active !== false ? "bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"}`}>
          {row.active !== false ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Location",
      accessor: "location",
      render: (row: any) => {
        const loc = row.location || {};
        if (loc.address) return loc.address;
        if (typeof loc.lat === "number" && typeof loc.lng === "number") {
          return `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        }
        // Fallback to standalone lat/lng columns
        const lat = row.latitude ?? loc.lat;
        const lng = row.longitude ?? loc.lng;
        if (lat != null && lng != null) {
          return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
        }
        return "—";
      },
    },
    {
      header: "Geofence",
      accessor: "geofence",
      render: (row: any) => {
        const gf = row.geofence || {};
        const parts: string[] = [];
        const radius = gf.radiusMeters ?? row.radius_meters;
        if (radius != null && typeof Number(radius) === "number" && !isNaN(Number(radius))) {
          parts.push(`Radius ${Number(radius)}m`);
        }
        if (Array.isArray(gf.polygon) && gf.polygon.length >= 3) {
          parts.push(`Fence (${gf.polygon.length} pts)`);
        }
        return parts.length ? parts.join(" · ") : "—";
      },
    },
    {
      header: "Visible",
      accessor: "showOnMap",
      render: (row: any) => (
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${row.showOnMap !== false ? "bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-400"}`}>
          {row.showOnMap !== false ? "Shown" : "Hidden"}
        </span>
      ),
    },
    { header: "Manager", accessor: "managerId" },
    {
      header: "Actions",
      accessor: "actions",
      render: (row: any) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/sites/${row.id}`}
            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200"
          >
            Edit
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
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">All Sites</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{rowsSafe.length} sites configured</p>
        </div>
      </div>
      <Table columns={columns} data={rowsSafe} />
    </div>
  );
}
