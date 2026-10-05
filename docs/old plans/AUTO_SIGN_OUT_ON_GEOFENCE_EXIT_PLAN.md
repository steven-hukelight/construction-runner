# Auto Sign-Out on Geofence Exit – Implementation Plan

**E2E verification:** run the checklist in [E2E_ATTENDANCE_AUTO_SIGNOUT_NOTIFICATIONS.md](./E2E_ATTENDANCE_AUTO_SIGNOUT_NOTIFICATIONS.md) (Phases 2, 4, 5).

**Implementation status (in-app, Phase 1):** delivered in the worker app as `lib/services/geofence_exit_monitor.dart`, `SiteGeofence.isDefinitelyOutsideSite`, and integration on `GeoAttendanceScreen`. While signed in with a site boundary, the monitor uses buffer + consecutive readings + minimum time outside before calling `POST /api/attendance` with `auto_sign_out` / `geofence_exit`. **Background / app-killed** behaviour is still out of scope here (see Optional: Background Monitoring below).

This document outlines the architecture and implementation steps for automatically signing out users when they leave the site geofence while signed in.

---

## Overview

**Goal:** When a user is signed in at a site and physically leaves the geofence (site boundary), the app automatically signs them out without requiring a manual tap.

**Current state (after Phase 1 implementation):**
- `_withinSite(Position)` checks if the user is inside the geofence (polygon or radius-based).
- `Geolocator.getPositionStream()` provides continuous location updates for the map and session pings.
- Sign-in/out is manual via the Sign In / Sign Out buttons **or automatic** when `GeofenceExitMonitor` confirms the user has left the boundary (while `GeoAttendanceScreen` is active).

**New behaviour:**
- While signed in, monitor location.
- If user moves outside the geofence → auto sign-out (with optional grace period and confirmation).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Geolocator.getPositionStream()                                  │
│  (existing – distanceFilter: 10)                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GeofenceExitMonitor (new)                                       │
│  - Subscribes to position stream when signed in                  │
│  - Calls _withinSite(pos) on each update                         │
│  - If outside for N consecutive readings → trigger auto sign-out │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  GeoAttendanceScreen                                             │
│  - Starts/stops monitor when _isSignedIn changes                 │
│  - On exit: call signOut() + show confirmation                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Design Decisions

### 1. Grace period / hysteresis

Avoid false sign-outs from GPS jitter or brief exits (e.g. walking near the boundary).

**Options:**

| Approach | Description |
|----------|-------------|
| **Consecutive readings** | Require N consecutive "outside" readings (e.g. 2–3) before auto sign-out |
| **Time-based** | Require outside for X seconds (e.g. 30s) before auto sign-out |
| **Distance-based (buffer)** | Require distance to be outside the fence **by at least a buffer** (e.g. 30–50 m) before counting as \"out\" |
| **Combined** | Outside (with buffer) for 2–3 readings AND at least 45 seconds |

**Recommendation:** Treat a user as \"definitely out\" only when they are **outside the fence by a buffer** and this state is sustained for **3 consecutive readings** and **45+ seconds**. All values are configurable constants.

**Concretely:**

- **Circle geofence:**  
  - Inside: `distance <= radius`  
  - Gray zone (near boundary): `radius < distance <= radius + bufferMeters` → do **not** auto sign-out yet  
  - Definitely out: `distance > radius + bufferMeters`  
- **Polygon geofence:**  
  - Compute approximate distance from point to polygon edge (nearest segment).  
  - Gray zone: `distanceToEdge <= bufferMeters`  
  - Definitely out: `distanceToEdge > bufferMeters`  

Only \"definitely out\" readings increment the outside counter; gray-zone readings reset/ignore the counter.

### 2. In-app only vs background

| Mode | Pros | Cons |
|------|------|------|
| **In-app only** | Simpler, no background location, better battery | User can leave app/screen and stay "signed in" until they return |
| **Background** | More accurate – signs out even if app is minimised | Requires background location, battery drain, platform permissions |

**Recommendation:** Start with **in-app only** (monitor only while `GeoAttendanceScreen` is visible and signed in). Add background as a future phase if needed.

### 3. User confirmation

| Approach | UX |
|----------|-----|
| **Silent auto sign-out** | No dialog; just sign out and show snackbar: "You left the site – signed out automatically" |
| **Confirmation dialog** | "You've left the site. Sign out?" [Cancel] [Sign Out] – gives user a chance to correct GPS glitches |

**Recommendation:** **Silent** with a clear snackbar. Optional setting to enable confirmation for edge cases.

### 4. Which site to monitor

User is signed in at a specific site. Use that site’s geofence (polygon or radius) for `_withinSite()`. The selected site (`_selectedSite`) is the sign-in site.

### 5. Online vs offline behaviour

Auto sign-out should reuse the **same online/offline pipeline** as manual sign-out:

- **Online:** call `AttendanceService.signOut(...)` which immediately POSTs to `/api/attendance`.
- **Offline:** `AttendanceService.signOut(...)` enqueues an auto sign-out event into `pending_attendance` with an `autoSignOut: true` flag in the payload for auditability.

This keeps behaviour consistent with the offline sign-in plan and ensures auto sign-outs are not lost when there is no network.

---

## Implementation

### New: GeofenceExitMonitor

**Location:** `lib/services/geofence_exit_monitor.dart` (or as a mixin/helper inside `geo_attendance_screen.dart`).

**Responsibilities:**
- Subscribe to `Geolocator.getPositionStream()` when started.
- On each `Position`, call a provided `withinSite(Position) -> bool` callback.
- If outside **by more than the buffer distance**: increment counter. If inside or in the gray zone near the edge: reset counter.
- When counter >= threshold (e.g. 3) and min time elapsed → invoke `onExited()` callback.
- Cancel subscription when stopped.

**Pseudocode:**

```dart
class GeofenceExitMonitor {
  StreamSubscription<Position>? _sub;
  int _consecutiveOutside = 0;
  DateTime? _firstOutsideAt;
  
  static const _consecutiveThreshold = 3;
  static const _minSecondsOutside = 45;

  void start({
    required bool Function(Position) withinSite,
    required VoidCallback onExited,
  }) {
    _sub = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 10,
      ),
    ).listen((pos) {
      if (withinSite(pos)) {
        _consecutiveOutside = 0;
        _firstOutsideAt = null;
        return;
      }
      _consecutiveOutside++;
      _firstOutsideAt ??= DateTime.now();
      final elapsed = DateTime.now().difference(_firstOutsideAt!).inSeconds;
      if (_consecutiveOutside >= _consecutiveThreshold && 
          elapsed >= _minSecondsOutside) {
        onExited();
        stop();
      }
    });
  }

  void stop() {
    _sub?.cancel();
    _sub = null;
    _consecutiveOutside = 0;
    _firstOutsideAt = null;
  }
}
```

---

## Integration with GeoAttendanceScreen

### 1. Add monitor instance

```dart
final _geofenceMonitor = GeofenceExitMonitor();
```

### 2. Start monitor when signed in

After a successful sign-in (where you set `_isSignedIn = true`), start the monitor:

```dart
_geofenceMonitor.start(
  withinSite: (pos) => _withinSite(pos),
  onExited: () => _handleGeofenceExit(),
);
```

### 3. Stop monitor when signed out or screen disposed

- On manual sign-out: `_geofenceMonitor.stop()`
- In `dispose()`: `_geofenceMonitor.stop()`
- When user navigates away: `dispose()` will run

### 4. Handle exit callback

```dart
Future<void> _handleGeofenceExit() async {
  if (!mounted) return;
  _geofenceMonitor.stop();
  setState(() => _isSignedIn = false);
  
  try {
    await AttendanceApiService.signIn(
      operativeId: widget.user.uid,
      action: 'sign_out',
      // ... same payload as manual sign-out
    );
    if (mounted) _show("You left the site – signed out automatically");
  } catch (e) {
    if (mounted) _show("Auto sign-out failed. Please sign out manually.");
  }
}
```

`_handleGeofenceExit` needs the same context as `_attemptSignIn` (site, user, position). Pass the last known `Position` or get a fresh one.

---

## Edge Cases

| Case | Handling |
|------|----------|
| **User changes site while signed in** | Stop monitor, or restart with new site’s geofence. Typically sign-in is per-site; changing site would require sign-out first. |
| **GPS accuracy is poor** | `_withinSite` already uses `effectiveRadius = radius - accuracy`. Avoid over-triggering. |
| **Screen disposed while outside** | Stop monitor in `dispose()`. Do not invoke sign-out after dispose – user has left the screen. |
| **User signs out manually while monitor running** | Stop monitor on sign-out. |
| **Network fails during auto sign-out** | Same as manual: show error, keep `_isSignedIn` false locally. If offline plan exists, queue the sign-out. |
| **App backgrounded** | In-app-only: monitor stops when screen is disposed. No action. |

---

## Configuration

Expose constants for tuning:

```dart
// GeofenceExitMonitor or a config class
static const int consecutiveOutsideThreshold = 3;  // readings
static const int minSecondsOutside = 45;           // seconds
```

Optionally load from remote config or settings later.

---

## Implementation Order

1. **GeofenceExitMonitor** – Create the service with configurable thresholds.
2. **GeoAttendanceScreen integration** – Add instance, start on sign-in, stop on sign-out/dispose.
3. **`_handleGeofenceExit()`** – Implement: call sign-out API, update UI, show snackbar.
4. **Testing** – Sign in, walk/drive outside boundary, confirm auto sign-out.
5. **(Optional)** Add setting: "Confirm before auto sign-out" for a prompt.

---

## Optional: Background Monitoring (Phase 2)

If you later want auto sign-out when the app is in the background:

- Use `geolocator`’s background mode or `flutter_background_geolocation` (or similar).
- Requires platform setup (iOS: background modes; Android: foreground service).
- Store "signed in at site X" in persistent storage (e.g. `SharedPreferences`).
- On app launch or when coming to foreground, check if still within site; if not, sign out.
- Or run a long-running background task that monitors location (higher battery impact).

Recommend starting with in-app monitoring and adding background only if there is a clear requirement.

---

## Summary

| Item | Recommendation |
|------|----------------|
| Trigger | User outside geofence for 3 consecutive readings and 45+ seconds |
| Scope | In-app only (while GeoAttendanceScreen is active and signed in) |
| UX | Silent auto sign-out + snackbar |
| New code | `GeofenceExitMonitor` service + integration in `GeoAttendanceScreen` |
