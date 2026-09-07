"use client";

import { useState } from "react";
import { useSWRConfig } from "swr";
import { MapPin } from "lucide-react";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { createSite } from "./actions";
import MapPicker from "./MapPicker";

export default function AddSiteModal() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    lat: "",
    lng: "",
    radius: "",
    showOnMap: true,
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

    // Optional geofence: radius-based and/or custom polygon
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

    try {
      setLoading(true);
      await createSite(payload);
      setOpen(false);
      // Revalidate table data without re-running Server Components (avoids production RSC digest errors).
      await mutate("/api/sites");
    } catch (e: any) {
      setError(e?.message || "Failed to create site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Add New Site</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Create a new site location with geofence</p>
          </div>
        </div>
        <Button onClick={() => setOpen((v) => !v)} size="sm">
          {open ? "Close" : "Add Site"}
        </Button>
      </div>

      {open && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <div className="space-y-4">
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

            <details className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <summary className="cursor-pointer text-sm font-medium text-blue-900 mb-2">
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

            <label className="flex items-center gap-2 text-sm text-slate-700">
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

            <div className="space-y-4 pt-2">
              <Button
                type="button"
                variant="primary"
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

            {error ? <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mt-1">{error}</div> : null}

            <div className="pt-2">
              <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
