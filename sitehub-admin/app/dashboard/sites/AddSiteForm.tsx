"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { createSite } from "./actions";
import MapPicker from "./MapPicker";
import { SiteManagerSelect } from "./SiteManagerSelect";

export default function AddSiteForm({
  onSaved,
  onCancel,
}: {
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    lat: "",
    lng: "",
    radius: "",
    showOnMap: true,
    managerId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [polygon, setPolygon] = useState<{ lat: number; lng: number }[]>([]);
  const { mutate } = useSWRConfig();

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) return setError("Name is required");

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const payload: any = {
      name: form.name.trim(),
      location: {
        address: form.address.trim() || null,
      },
    };

    if (form.lat && form.lng) {
      const lat = Number(form.lat);
      const lng = Number(form.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        payload.location.lat = lat;
        payload.location.lng = lng;
      }
    }

    const radiusNum = form.radius ? Number(form.radius) : NaN;
    const hasLatLng =
      typeof payload.location.lat === "number" &&
      typeof payload.location.lng === "number";

    if (hasLatLng || polygon.length) {
      payload.geofence = {
        center: hasLatLng
          ? { lat: payload.location.lat, lng: payload.location.lng }
          : null,
        radiusMeters:
          Number.isFinite(radiusNum) && radiusNum > 0 && hasLatLng
            ? radiusNum
            : null,
        polygon: polygon.length ? polygon : null,
      };
    }

    payload.showOnMap = !!form.showOnMap;
    payload.managerId = form.managerId.trim() || null;

    try {
      setLoading(true);
      await createSite(payload);
      await mutate("/api/sites");
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || "Failed to create site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-blue-100 bg-[#f8fbfe] p-4 dark:border-slate-600 dark:bg-slate-900/40">
      <Input
        label="Site Name"
        value={form.name}
        onChange={(e: any) => setForm({ ...form, name: e.target.value })}
      />

      <Input
        label="Address (optional)"
        value={form.address}
        onChange={(e: any) => setForm({ ...form, address: e.target.value })}
      />

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">Site manager</p>
        <SiteManagerSelect
          variant="table"
          value={form.managerId}
          onChange={(id) => setForm((prev) => ({ ...prev, managerId: id }))}
        />
        <p className="mt-1 text-xs text-slate-500">Super Admin, Site Admin, or Supervisor.</p>
      </div>

      <details className="rounded-xl border border-blue-100 bg-white p-3 dark:border-slate-600 dark:bg-slate-800">
        <summary className="mb-2 cursor-pointer text-sm font-medium text-blue-900 dark:text-blue-200">
          Advanced: latitude / longitude
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Input
            label="Latitude (optional)"
            value={form.lat}
            onChange={(e: any) => setForm({ ...form, lat: e.target.value })}
          />
          <Input
            label="Longitude (optional)"
            value={form.lng}
            onChange={(e: any) => setForm({ ...form, lng: e.target.value })}
          />
        </div>
      </details>

      <Input
        label="Geofence radius (metres, optional)"
        type="number"
        value={form.radius}
        onChange={(e: any) => setForm({ ...form, radius: e.target.value })}
      />

      <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={form.showOnMap}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, showOnMap: e.target.checked }))
          }
          className="h-4 w-4 rounded border-slate-300"
        />
        Show on mobile map
      </label>

      <div className="space-y-4 pt-1">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-center"
          onClick={() => setShowMap((v) => !v)}
        >
          {showMap ? "Hide map selector" : "Select location from map"}
        </Button>

        {showMap && (
          <MapPicker
            lat={form.lat}
            lng={form.lng}
            radius={form.radius}
            polygon={polygon}
            onChange={(coords) =>
              setForm((prev) => ({ ...prev, lat: coords.lat, lng: coords.lng }))
            }
            onRadiusChange={(value) =>
              setForm((prev) => ({ ...prev, radius: value }))
            }
            onPolygonChange={(points) => setPolygon(points)}
          />
        )}
      </div>

      {error ? (
        <div className="mt-1 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex gap-3 pt-1">
        {onCancel ? (
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button onClick={handleSubmit} className="flex-1" disabled={loading}>
          {loading ? "Saving..." : "Save site"}
        </Button>
      </div>
    </div>
  );
}
