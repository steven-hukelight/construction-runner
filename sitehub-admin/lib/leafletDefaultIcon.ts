/** Leaflet’s default marker images break under Next.js bundling. Point them at /public. */
export function applyLeafletDefaultIcon(L: {
  Icon: {
    Default: {
      prototype: { _getIconUrl?: unknown };
      mergeOptions: (options: Record<string, unknown>) => void;
    };
  };
}) {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconUrl: "/leaflet/marker-icon.png",
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    shadowUrl: "/leaflet/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
  });
}
