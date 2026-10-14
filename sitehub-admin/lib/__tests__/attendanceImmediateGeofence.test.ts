import {
  GPS_JUMP_METERS,
  MAX_EXIT_CLIENT_AGE_MS,
  MAX_IMMEDIATE_EXIT_ACCURACY_M,
  SIGN_IN_GRACE_MS,
  decideImmediateGeofenceExit,
} from "../attendanceImmediateGeofence";

const now = new Date("2026-10-09T07:35:10.000Z");
const signInAt = new Date("2026-10-09T07:33:52.000Z");

const lsqInside = { lat: 51.4885913, lng: 0.0643319 };
const lsqJump = { lat: 51.4854565, lng: 0.0659542 };

function base(overrides: Partial<Parameters<typeof decideImmediateGeofenceExit>[0]> = {}) {
  return decideImmediateGeofenceExit({
    geofenceExitPing: true,
    geometryOutside: true,
    signInAt,
    now,
    accuracyM: 41.17,
    previousOutside: false,
    previousLat: lsqInside.lat,
    previousLng: lsqInside.lng,
    currentLat: lsqJump.lat,
    currentLng: lsqJump.lng,
    outsideClearanceM: 185,
    ...overrides,
  });
}

describe("decideImmediateGeofenceExit", () => {
  it("does not kick someone out on the first jumpy ping after sign-in (LSQ 9 Oct)", () => {
    expect(base()).toEqual({ action: "ignore_restore", reason: "sign_in_grace" });
  });

  it("still rejects that LSQ jump after the grace window", () => {
    expect(
      base({
        signInAt: new Date(now.getTime() - SIGN_IN_GRACE_MS - 1_000),
      }),
    ).toEqual({ action: "ignore_restore", reason: "gps_jump" });
  });

  it("rejects a cached client fix even when geometry says outside", () => {
    expect(
      base({
        signInAt: new Date(now.getTime() - SIGN_IN_GRACE_MS - 1_000),
        previousOutside: true,
        previousLat: lsqJump.lat,
        previousLng: lsqJump.lng,
        accuracyM: 12,
        clientTimestampMs: now.getTime() - MAX_EXIT_CLIENT_AGE_MS - 1_000,
      }),
    ).toEqual({ action: "ignore_restore", reason: "stale_client_fix" });
  });

  it("rejects a coarse fix that would otherwise look like a leave", () => {
    expect(
      base({
        signInAt: new Date(now.getTime() - SIGN_IN_GRACE_MS - 1_000),
        previousOutside: true,
        previousLat: lsqJump.lat,
        previousLng: lsqJump.lng,
        accuracyM: MAX_IMMEDIATE_EXIT_ACCURACY_M + 1,
        outsideClearanceM: 200,
      }),
    ).toEqual({ action: "ignore_restore", reason: "accuracy_too_coarse" });
  });

  it("holds the outside flag on the first confirmed ping, then signs out on the second", () => {
    const afterGrace = new Date(now.getTime() - SIGN_IN_GRACE_MS - 1_000);
    const first = base({
      signInAt: afterGrace,
      accuracyM: 12,
      previousLat: lsqJump.lat + 0.0002,
      previousLng: lsqJump.lng,
      currentLat: lsqJump.lat,
      currentLng: lsqJump.lng,
      outsideClearanceM: 180,
    });
    expect(first).toEqual({ action: "hold_outside", reason: "awaiting_second_outside_ping" });

    const second = base({
      signInAt: afterGrace,
      accuracyM: 12,
      previousOutside: true,
      previousLat: lsqJump.lat,
      previousLng: lsqJump.lng,
      currentLat: lsqJump.lat,
      currentLng: lsqJump.lng,
      outsideClearanceM: 180,
    });
    expect(second).toEqual({ action: "sign_out", reason: "confirmed_outside" });
  });

  it("clears an untrusted first ping when there is no previous location to restore", () => {
    expect(
      base({
        previousLat: null,
        previousLng: null,
      }),
    ).toEqual({ action: "ignore_clear", reason: "sign_in_grace" });
  });

  it("does not treat a short walk as a GPS jump", () => {
    expect(GPS_JUMP_METERS).toBeGreaterThan(100);
    const afterGrace = new Date(now.getTime() - SIGN_IN_GRACE_MS - 1_000);
    expect(
      base({
        signInAt: afterGrace,
        accuracyM: 12,
        previousLat: 51.4855,
        previousLng: 0.06595,
        currentLat: 51.4854,
        currentLng: 0.06595,
        outsideClearanceM: 180,
      }),
    ).toEqual({ action: "hold_outside", reason: "awaiting_second_outside_ping" });
  });
});
