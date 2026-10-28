"use client";

import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

/** Click the map to set a muster point. Reuses the same Leaflet tiles as the site geofence picker. */
export default function MusterMapPin({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (coords: LatLng | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<{ setView: (ll: [number, number], z?: number) => void } | null>(null);
  const markerRef = useRef<{ setLatLng: (ll: LatLng) => void; remove: () => void } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    let map: { remove: () => void } | null = null;

    async function init() {
      const leaflet = await import("leaflet");
      const L = (leaflet as { default?: typeof leaflet } & typeof leaflet).default ?? leaflet;
      const { applyLeafletDefaultIcon } = await import("@/lib/leafletDefaultIcon");
      applyLeafletDefaultIcon(L);
      if (!containerRef.current || cancelled) return;

      const start: [number, number] = [lat ?? 51.505, lng ?? -0.09];
      const instance = L.map(containerRef.current).setView(start, lat == null ? 6 : 17);
      map = instance;
      mapRef.current = instance;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(instance);

      if (lat != null && lng != null) {
        markerRef.current = L.marker([lat, lng]).addTo(instance);
      }

      instance.on("click", (e: { latlng: LatLng }) => {
        const next = { lat: e.latlng.lat, lng: e.latlng.lng };
        if (markerRef.current) markerRef.current.setLatLng(next);
        else markerRef.current = L.marker(next).addTo(instance);
        onChangeRef.current(next);
      });
    }

    void init();
    return () => {
      cancelled = true;
      markerRef.current = null;
      mapRef.current = null;
      map?.remove();
    };
    // One map per mount. Marker updates happen in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    markerRef.current?.setLatLng({ lat, lng });
    mapRef.current?.setView([lat, lng], 17);
  }, [lat, lng]);

  return <div ref={containerRef} className="h-56 w-full rounded-lg overflow-hidden border border-slate-200" />;
}
