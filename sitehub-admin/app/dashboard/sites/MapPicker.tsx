"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from "react";

type FencePoint = { lat: number; lng: number };

type MapPickerProps = {
  lat?: string;
  lng?: string;
  radius?: string;
  polygon?: FencePoint[];
  onChange: (coords: { lat: string; lng: string }) => void;
  onRadiusChange?: (radius: string) => void;
  onPolygonChange?: (points: FencePoint[]) => void;
};

export default function MapPicker({
  lat,
  lng,
  radius,
  polygon,
  onChange,
  onRadiusChange,
  onPolygonChange,
}: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
   const circleRef = useRef<any>(null);
   const polygonRef = useRef<any>(null);
   const modeRef = useRef<"radius" | "polygon">("radius");
   const vertexMarkersRef = useRef<any[]>([]);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mode, setMode] = useState<"radius" | "polygon">("radius");
  const [polygonPoints, setPolygonPoints] = useState<FencePoint[]>(polygon || []);
  void onRadiusChange;

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const leaflet = await import("leaflet");
      const L = (leaflet as any).default || leaflet;

      if (!containerRef.current || !isMounted) return;

      const startLat = lat ? parseFloat(lat) : 51.505;
      const startLng = lng ? parseFloat(lng) : -0.09;

      const map = L.map(containerRef.current).setView([startLat, startLng], 17);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      if (lat && lng && !Number.isNaN(startLat) && !Number.isNaN(startLng)) {
        markerRef.current = L.marker([startLat, startLng]).addTo(map);
      }

      // Initialise existing polygon fence if provided
      if (polygon && polygon.length >= 3) {
        const pts = polygon.map((p) => [p.lat, p.lng]);
        polygonRef.current = L.polygon(pts, {
          color: "#2563eb",
          weight: 2,
          fillColor: "#60a5fa",
          fillOpacity: 0.2,
        }).addTo(map);
        
        // Add draggable vertex markers for existing polygon
        polygon.forEach((point, idx) => {
          const vertexMarker = L.circleMarker([point.lat, point.lng], {
            radius: 6,
            color: "#2563eb",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 2,
            draggable: true
          }).addTo(map);
          
          vertexMarker.on("drag", () => {
            updatePolygonVertex(idx, vertexMarker.getLatLng());
          });
          
          vertexMarker.on("contextmenu", (evt: any) => {
            evt.originalEvent.preventDefault();
            removePolygonVertex(idx);
          });
          
          vertexMarkersRef.current.push(vertexMarker);
        });
      }

      // Helper function to update a polygon vertex
      function updatePolygonVertex(idx: number, newLatLng: any) {
        if (!polygonRef.current) return;
        const currentPoints = polygonRef.current.getLatLngs()[0];
        currentPoints[idx] = newLatLng;
        polygonRef.current.setLatLngs(currentPoints);
        
        const updatedPoints: FencePoint[] = currentPoints.map((p: any) => ({
          lat: p.lat,
          lng: p.lng,
        }));
        
        if (onPolygonChange) {
          onPolygonChange(updatedPoints);
        }
      }
      
      // Helper function to remove a polygon vertex
      function removePolygonVertex(idx: number) {
        if (!polygonRef.current) return;
        const currentPoints = polygonRef.current.getLatLngs()[0];
        
        if (currentPoints.length <= 3) {
          alert("A polygon must have at least 3 points.");
          return;
        }
        
        currentPoints.splice(idx, 1);
        polygonRef.current.setLatLngs(currentPoints);
        
        // Remove the marker
        if (vertexMarkersRef.current[idx]) {
          mapRef.current.removeLayer(vertexMarkersRef.current[idx]);
          vertexMarkersRef.current.splice(idx, 1);
        }
        
        // Reindex remaining markers
        vertexMarkersRef.current.forEach((marker, i) => {
          marker.off("drag");
          marker.off("contextmenu");
          
          marker.on("drag", () => {
            updatePolygonVertex(i, marker.getLatLng());
          });
          
          marker.on("contextmenu", (evt: any) => {
            evt.originalEvent.preventDefault();
            removePolygonVertex(i);
          });
        });
        
        const updatedPoints: FencePoint[] = currentPoints.map((p: any) => ({
          lat: p.lat,
          lng: p.lng,
        }));
        
        if (onPolygonChange) {
          onPolygonChange(updatedPoints);
        }
      }

      map.on("click", (e: any) => {
        const { lat: cLat, lng: cLng } = e.latlng;

        if (modeRef.current === "polygon") {
          const nextPoints: FencePoint[] = polygonRef.current
            ? polygonRef.current.getLatLngs()[0].map((p: any) => ({
                lat: p.lat,
                lng: p.lng,
              }))
            : [];
          nextPoints.push({ lat: cLat, lng: cLng });

          if (polygonRef.current) {
            polygonRef.current.setLatLngs(nextPoints.map((p) => [p.lat, p.lng]));
          } else {
            polygonRef.current = L.polygon(nextPoints.map((p) => [p.lat, p.lng]), {
              color: "#2563eb",
              weight: 2,
              fillColor: "#60a5fa",
              fillOpacity: 0.2,
            }).addTo(map);
          }
          
          // Add draggable vertex marker for the new point
          const vertexMarker = L.circleMarker([cLat, cLng], {
            radius: 6,
            color: "#2563eb",
            fillColor: "#fff",
            fillOpacity: 1,
            weight: 2,
            draggable: true
          }).addTo(map);
          
          const currentIdx = nextPoints.length - 1;
          
          vertexMarker.on("drag", () => {
            updatePolygonVertex(currentIdx, vertexMarker.getLatLng());
          });
          
          vertexMarker.on("contextmenu", (evt: any) => {
            evt.originalEvent.preventDefault();
            removePolygonVertex(currentIdx);
          });
          
          vertexMarkersRef.current.push(vertexMarker);

          if (onPolygonChange) {
            onPolygonChange(nextPoints);
          }
        } else {
          // radius / point mode: move marker and update center
          if (markerRef.current) {
            markerRef.current.setLatLng([cLat, cLng]);
          } else {
            markerRef.current = L.marker([cLat, cLng]).addTo(map);
          }
          onChange({ lat: cLat.toFixed(6), lng: cLng.toFixed(6) });
        }
      });
    }

    init();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      circleRef.current = null;
      polygonRef.current = null;
      vertexMarkersRef.current = [];
    };
  }, []);

  // Keep internal mode ref in sync for click handler
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // Draw / update geofence radius circle when center or radius changes
  useEffect(() => {
    async function updateCircle() {
      if (!mapRef.current) return;

      const r = radius ? parseFloat(radius) : NaN;
      if (!Number.isFinite(r) || r <= 0) {
        if (circleRef.current) {
          mapRef.current.removeLayer(circleRef.current);
          circleRef.current = null;
        }
        return;
      }

      const leaflet = await import("leaflet");
      const L = (leaflet as any).default || leaflet;

      const centerLat = lat ? parseFloat(lat) : 51.505;
      const centerLng = lng ? parseFloat(lng) : -0.09;

      if (circleRef.current) {
        circleRef.current.setLatLng([centerLat, centerLng]);
        circleRef.current.setRadius(r);
      } else {
        circleRef.current = L.circle([centerLat, centerLng], {
          radius: r,
          color: "#2563eb",
          weight: 1.5,
          fillColor: "#60a5fa",
          fillOpacity: 0.2,
        }).addTo(mapRef.current);
      }
    }

    updateCircle();
  }, [radius, lat, lng]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    if (!query.trim()) return;

    if (!mapRef.current) {
      setSearchError("Map is not ready yet.");
      return;
    }

    try {
      setSearching(true);
      // Proxied via /api/geocode/search so Nominatim gets a valid User-Agent and avoids browser CORS blocks.
      const searchWithCountry = async (countryCodes?: string) => {
        const params = new URLSearchParams({ q: query.trim(), limit: "1" });
        if (countryCodes) params.set("countrycodes", countryCodes);
        const r = await fetch(`/api/geocode/search?${params.toString()}`);
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(
            typeof (err as { error?: string }).error === "string"
              ? (err as { error: string }).error
              : `HTTP ${r.status}`
          );
        }
        return r.json() as Promise<any[]>;
      };

      let json: any[] = await searchWithCountry("gb");
      if (!json.length) {
        json = await searchWithCountry();
      }
      if (!json.length) {
        setSearchError("No results for that address.");
        return;
      }
      const first = json[0];
      const cLat = parseFloat(first.lat);
      const cLng = parseFloat(first.lon);
      if (!Number.isFinite(cLat) || !Number.isFinite(cLng)) {
        setSearchError("Could not read coordinates for that result.");
        return;
      }

      mapRef.current.setView([cLat, cLng], 18);
      if (markerRef.current) {
        markerRef.current.setLatLng([cLat, cLng]);
      } else {
        const leaflet = await import("leaflet");
        const L = (leaflet as any).default || leaflet;
        markerRef.current = L.marker([cLat, cLng]).addTo(mapRef.current);
      }

      onChange({ lat: cLat.toFixed(6), lng: cLng.toFixed(6) });
    } catch (err) {
      console.warn("[MapPicker] search error", err);
      setSearchError(
        err instanceof Error && err.message
          ? err.message
          : "Search failed. Please try again."
      );
    } finally {
      setSearching(false);
    }
  }

  function handleClearPolygon() {
    if (!mapRef.current) return;
    
    // Remove polygon
    if (polygonRef.current) {
      mapRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
    }
    
    // Remove all vertex markers
    vertexMarkersRef.current.forEach((marker) => {
      mapRef.current.removeLayer(marker);
    });
    vertexMarkersRef.current = [];
    
    // Update state
    setPolygonPoints([]);
    
    if (onPolygonChange) {
      onPolygonChange([]);
    }
  }
  
  function handleUndoLastPoint() {
    if (!polygonRef.current || vertexMarkersRef.current.length === 0) return;
    
    const currentPoints = polygonRef.current.getLatLngs()[0];
    
    if (currentPoints.length <= 3) {
      // If only 3 points, clear the entire polygon
      handleClearPolygon();
      return;
    }
    
    // Remove last point
    currentPoints.pop();
    
    // Remove last vertex marker
    const lastMarker = vertexMarkersRef.current.pop();
    if (lastMarker && mapRef.current) {
      mapRef.current.removeLayer(lastMarker);
    }
    
    // Update polygon
    polygonRef.current.setLatLngs(currentPoints);
    
    const updatedPoints: FencePoint[] = currentPoints.map((p: any) => ({
      lat: p.lat,
      lng: p.lng,
    }));
    
    setPolygonPoints(updatedPoints);
    
    if (onPolygonChange) {
      onPolygonChange(updatedPoints);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
        <span>Fence mode:</span>
        <div className="flex gap-1">
          <button
            type="button"
            className={`button small ${mode === "radius" ? "" : "ghost"}`}
            onClick={() => setMode("radius")}
          >
            Radius
          </button>
          <button
            type="button"
            className={`button small ${mode === "polygon" ? "" : "ghost"}`}
            onClick={() => setMode("polygon")}
          >
            Draw fence
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Search address or postcode"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input flex-1 text-sm"
        />
        <button
          type="submit"
          className="button small"
          disabled={searching}
        >
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {mode === "polygon" && (
        <div className="flex gap-2 items-center">
          <button
            type="button"
            className="button small ghost"
            onClick={handleUndoLastPoint}
            disabled={!polygonRef.current}
          >
            ↩ Undo
          </button>
          <button
            type="button"
            className="button small ghost text-rose-600"
            onClick={handleClearPolygon}
            disabled={!polygonRef.current}
          >
            Clear fence
          </button>
          {polygonRef.current && vertexMarkersRef.current.length > 0 && (
            <span className="text-xs text-slate-500 ml-auto">
              {vertexMarkersRef.current.length} points
            </span>
          )}
        </div>
      )}

      <p className="text-xs text-slate-500">
        {mode === "polygon" ? (
          <>
            <strong>Click</strong> to add points. <strong>Drag</strong> points to adjust. <strong>Right-click</strong> a point to remove it.
          </>
        ) : (
          "Click on the map to set the site location. Adjust radius to size the geofence."
        )}
      </p>

      {searchError && (
        <p className="text-xs text-rose-500">{searchError}</p>
      )}
      <div
        ref={containerRef}
        className="w-full min-h-[420px] h-[min(55vh,520px)] rounded-xl border border-slate-200 overflow-hidden bg-slate-100"
      />
    </div>
  );
}
