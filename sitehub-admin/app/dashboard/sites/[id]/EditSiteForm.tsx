"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import MapPicker from "../MapPicker";
import { updateSite } from "../actions";

export default function EditSiteForm({ site }: { site: any }) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: site.name || "",
    address: site.location?.address || "",
    lat:
      typeof site.location?.lat === "number"
        ? site.location.lat.toString()
        : "",
    lng:
      typeof site.location?.lng === "number"
        ? site.location.lng.toString()
        : "",
    radius:
      typeof site.geofence?.radiusMeters === "number"
        ? site.geofence.radiusMeters.toString()
        : "",
    showOnMap: site.showOnMap !== false,
    inductionRequired: site.inductionRequired === true,
  });

  const [polygon, setPolygon] = useState<{ lat: number; lng: number }[]>(
    Array.isArray(site.geofence?.polygon) ? site.geofence.polygon : []
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);

  async function handleSubmit() {
    setError(null);
    if (!form.name.trim()) return setError("Name is required");

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
    } else {
      payload.geofence = null;
    }

    payload.showOnMap = !!form.showOnMap;
    payload.inductionRequired = !!form.inductionRequired;

    try {
      setLoading(true);
      await updateSite(site.id, payload);
      router.push("/dashboard/sites");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to update site");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full md:max-w-xl">
      <h3 className="text-lg font-semibold text-white mb-4">Edit Site</h3>
      <div className="space-y-5">
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

        <details className="bg-white/5 rounded-md p-3 text-sm">
          <summary className="cursor-pointer text-slate-100 font-medium mb-2">
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

        <label className="flex items-center gap-2 text-sm text-slate-100">
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
        <label className="flex items-center gap-2 text-sm text-slate-100">
          <input
            type="checkbox"
            checked={form.inductionRequired}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, inductionRequired: e.target.checked }))
            }
            className="h-4 w-4 rounded border-slate-300"
          />
          Induction required for this site
        </label>

        <div className="space-y-4 pt-2">
          <Button
            type="button"
            variant="primary"
            className="w-full justify-center"
            onClick={() => setShowMap((v) => !v)}
          >
            {showMap ? "Hide map selector" : "Show map selector"}
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
          <div className="text-sm text-red-400 mt-1">{error}</div>
        ) : null}

        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={() => {
              router.push("/dashboard/sites");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
