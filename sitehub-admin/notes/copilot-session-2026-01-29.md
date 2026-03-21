# Copilot Session – 29 Jan 2026

This file captures a short summary of what we implemented today in the `sitehub-admin` project so you can resume tomorrow.

## Key changes today

- **Sidebar & Branding**
  - Adjusted spacing between logo and "Construction Runner" text in the sidebar.

- **Sites: Geofencing**
  - Added support for storing `geofence` data on `sites` in Firestore (center, radius in metres, and optional polygon fence).
  - Updated Add Site form to:
    - Capture geofence radius.
    - Use the map to set center and optionally draw a polygon fence.
  - Added an Edit Site page (`/dashboard/sites/[id]`) with a similar form so you can adjust geofence later.

- **Sites: Map & Editing**
  - Enhanced `MapPicker` so it can:
    - Show a radius circle around the center.
    - Switch between radius mode and polygon drawing mode.
    - Build a polygon fence by clicking around the site.
  - Sites table now:
    - Shows a **Geofence** column (radius and/or fence summary).
    - Includes **Edit** and **View map** actions for each site.

- **Sites: Mobile map pin toggle**
  - Added a `showOnMap` boolean on each site document.
  - Add & Edit Site forms now have a **"Show on mobile map"** checkbox.
  - Latitude/Longitude fields are moved into an **Advanced: latitude / longitude** dropdown to keep the UI clean.

## Where to pick up tomorrow

- Test creating and editing a few sites to confirm:
  - Geofence radius and polygon save correctly.
  - `showOnMap` is set as expected.
  - The Sites table shows the updated geofence info.
- Update your mobile app to:
  - Query `sites` where `showOnMap == true`.
  - Use `location.lat` / `location.lng` and `geofence` to place pins and fences on the mobile map.

You can always ask Copilot to "summarise the last session" or to extend any of the features listed here.
