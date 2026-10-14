import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { sendAttendanceAutoSignOutPush } from "@/lib/attendanceAutoSignOutPush";
import {
  MAX_FALLBACK_ACCURACY_M,
  shouldSkipCoarseFallbackOutsideEval,
} from "@/lib/attendanceCoarseFallback";
import {
  decideImmediateGeofenceExit,
  parseCoord,
} from "@/lib/attendanceImmediateGeofence";

export const dynamic = "force-dynamic";

function normalizeAttendanceAction(raw: string | null | undefined): string {
  return (raw ?? "").toString().toUpperCase().replace(/\s+/g, "_");
}

/**
 * POST /api/attendance/location — update last known location on an open sign-in row (foreground only).
 * Sets last_location_timestamp (server time) and last_location_outside_fence via DB RPC when available.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const attendanceId = body.attendanceId ?? body.attendance_id;
    const lat = body.lat ?? body.latitude;
    const lng = body.lng ?? body.longitude ?? body.lon;
    const operativeIdLog = body.operativeId ?? body.operative_id ?? null;
    const siteIdLog = body.siteId ?? body.site_id ?? null;

    if (!attendanceId || lat == null || lng == null) {
      return NextResponse.json(
        { error: "attendanceId, lat, and lng required" },
        { status: 400 }
      );
    }

    const mobileAuth = await resolvePreInductionAuth({ req });
    const authHeader = req.headers.get("authorization");
    const hasBearer = authHeader?.toLowerCase().startsWith("bearer ") ?? false;

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("attendance")
      .select(
        "id, user_id, action, timestamp, created_at, latitude, longitude, last_location_lat, last_location_lng, last_location_accuracy, last_location_outside_fence"
      )
      .eq("id", String(attendanceId))
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Attendance session not found" }, { status: 404 });
    }

    const uid = String((row as { user_id: string }).user_id);

    if (hasBearer) {
      if (!mobileAuth.uid) {
        return NextResponse.json(
          {
            error: "Unauthorized",
            message: "Invalid or expired session. Sign in again.",
          },
          { status: 401 }
        );
      }
      if (uid !== String(mobileAuth.uid)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const cookieStore = await cookies();
      const role = cookieStore.get("role")?.value ?? mobileAuth.role ?? "";
      const roleLower = role.toLowerCase();
      if (roleLower === "operative") {
        const email = cookieStore.get("user_email")?.value ?? mobileAuth.userEmail ?? "";
        const { data: me } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
        if (!me?.id || String(me.id) !== uid) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } else if (mobileAuth.uid && uid === String(mobileAuth.uid)) {
        // Signed-in non-operative (e.g. supervisor on the app) posting for their own session.
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const lastNorm = normalizeAttendanceAction((row as { action?: string }).action);
    const isSignIn =
      lastNorm === "SIGN_IN" || lastNorm === "IN" || lastNorm === "SIGNIN" || lastNorm === "CHECKIN";
    if (!isSignIn) {
      return NextResponse.json(
        { error: "not_signed_in", message: "That attendance row is not an open sign-in session." },
        { status: 409 }
      );
    }

    const signInAt =
      (row as { timestamp?: string | null }).timestamp ??
      (row as { created_at?: string | null }).created_at ??
      null;
    if (signInAt) {
      const { data: laterRows } = await supabaseAdmin
        .from("attendance")
        .select("id, action")
        .eq("user_id", uid)
        .neq("id", String(row.id))
        .gte("created_at", signInAt)
        .limit(20);
      const hasLaterSignOut = (laterRows ?? []).some((r) => {
        const n = normalizeAttendanceAction((r as { action?: string }).action);
        return n === "SIGN_OUT" || n === "OUT" || n === "SIGNOUT" || n === "CHECKOUT";
      });
      if (hasLaterSignOut) {
        return NextResponse.json(
          { error: "not_signed_in", message: "This session has already been signed out." },
          { status: 409 }
        );
      }
    }

    const acc = body.accuracy != null && body.accuracy !== "" ? Number(body.accuracy) : null;
    const pAcc = acc != null && Number.isFinite(acc) ? acc : 0;

    const geofenceExitPing =
      body.geofenceExit === true ||
      body.geofence_exit === true ||
      body.outsideFence === true ||
      body.outside_fence === true;

    const fallbackPing = body.fallbackPing === true || body.fallback_ping === true;
    const maxFallbackAgeMs = 15 * 60 * 1000;
    const clientTsRaw = body.timestampMillis ?? body.timestamp_millis;
    const clientTs = clientTsRaw != null && clientTsRaw !== "" ? Number(clientTsRaw) : NaN;
    const clientAgeOk =
      !Number.isFinite(clientTs) || Math.abs(Date.now() - clientTs) <= maxFallbackAgeMs;

    if (
      shouldSkipCoarseFallbackOutsideEval({
        fallbackPing,
        accuracyM: pAcc,
        clientAgeOk,
      })
    ) {
      // Do not refresh last_location_timestamp. A coarse heartbeat used to
      // keep the row "fresh" while last_location_outside_fence stayed false
      // from the last on-site GPS, so pg_cron never closed the session.
      console.log("[attendance/location] fallback ping skipped outside eval (no timestamp bump)", {
        attendanceId: String(row.id),
        accuracy: pAcc,
        clientAgeOk,
        reason: pAcc > MAX_FALLBACK_ACCURACY_M ? "accuracy" : "stale_timestamp",
      });
      return NextResponse.json({
        ok: true,
        fallbackPing: true,
        skippedOutsideEval: true,
        skipped_outside_eval: true,
        skippedTimestampBump: true,
      });
    }

    const outsideThresholdM = (() => {
      const raw = process.env.ATTENDANCE_OUTSIDE_THRESHOLD_METERS;
      if (raw == null || String(raw).trim() === "") return 35;
      const n = Number(raw);
      return Number.isFinite(n) && n >= 0 ? Math.min(200, Math.max(0, n)) : 35;
    })();

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("attendance_apply_location_ping", {
      p_attendance_id: String(row.id),
      p_lat: Number(lat),
      p_lng: Number(lng),
      p_acc: pAcc,
      p_outside_threshold_m: outsideThresholdM,
    });

    if (!rpcError && rpcData && typeof rpcData === "object") {
      const r = rpcData as Record<string, unknown>;
      if (r.ok === true) {
        const lastTs = r.lastLocationTimestamp ?? r.last_location_timestamp;
        const outside =
          r.lastLocationOutsideFence === true || r.last_location_outside_fence === true;
        const skippedCoarsePing =
          r.skippedCoarsePing === true || r.skipped_coarse_ping === true;
        const previousLat =
          parseCoord((row as { last_location_lat?: unknown }).last_location_lat) ??
          parseCoord((row as { latitude?: unknown }).latitude);
        const previousLng =
          parseCoord((row as { last_location_lng?: unknown }).last_location_lng) ??
          parseCoord((row as { longitude?: unknown }).longitude);
        const previousOutside =
          (row as { last_location_outside_fence?: unknown }).last_location_outside_fence === true;
        const clearance = parseCoord(
          r.outsideClearanceMeters ?? r.outside_clearance_meters
        );
        if (geofenceExitPing && !outside) {
          console.warn("[AUTO-SIGN-OUT][location] geofence_exit_ping_but_geometry_inside_threshold", {
            attendanceId: String(row.id),
            operativeId: operativeIdLog,
            siteId: siteIdLog,
            lastLocationTimestamp: lastTs,
            insideFence: r.insideFence ?? r.inside_fence,
            outsideThresholdMeters: outsideThresholdM,
            outsideClearanceMeters: r.outsideClearanceMeters ?? r.outside_clearance_meters,
          });
        }
        if (geofenceExitPing && outside && !skippedCoarsePing) {
          const decision = decideImmediateGeofenceExit({
            geofenceExitPing,
            geometryOutside: outside,
            skippedCoarsePing,
            signInAt,
            accuracyM: pAcc,
            clientTimestampMs: Number.isFinite(clientTs) ? clientTs : null,
            previousOutside,
            previousLat,
            previousLng,
            currentLat: Number(lat),
            currentLng: Number(lng),
            outsideClearanceM: clearance,
          });
          if (decision.action === "ignore_restore" || decision.action === "ignore_clear") {
            const revert: Record<string, unknown> = {
              last_location_outside_fence: previousOutside ? true : false,
            };
            if (decision.action === "ignore_restore" && previousLat != null && previousLng != null) {
              revert.last_location_lat = previousLat;
              revert.last_location_lng = previousLng;
              const previousAcc = parseCoord(
                (row as { last_location_accuracy?: unknown }).last_location_accuracy
              );
              if (previousAcc != null) revert.last_location_accuracy = previousAcc;
            } else if (decision.action === "ignore_clear") {
              revert.last_location_lat = null;
              revert.last_location_lng = null;
              revert.last_location_outside_fence = false;
            }
            const { error: revertErr } = await supabaseAdmin
              .from("attendance")
              .update(revert)
              .eq("id", row.id);
            if (revertErr) {
              console.warn("[AUTO-SIGN-OUT][location] untrusted_outside_revert_failed", {
                attendanceId: String(row.id),
                decision,
                revertErr,
              });
            }
            console.warn("[AUTO-SIGN-OUT][location] immediate_sign_out_held", {
              attendanceId: String(row.id),
              operativeId: operativeIdLog,
              siteId: siteIdLog,
              reason: decision.reason,
              action: decision.action,
              accuracy: pAcc,
              outsideClearanceMeters: clearance,
            });
            return NextResponse.json({
              ok: true,
              lastLocationTimestamp: lastTs,
              lastLocationOutsideFence: revert.last_location_outside_fence === true,
              insideFence: r.insideFence ?? r.inside_fence,
              outsideThresholdMeters: outsideThresholdM,
              outsideClearanceMeters: clearance,
              fallbackPing: fallbackPing || undefined,
              immediateAutoSignOut: false,
              geofenceExitHeld: true,
              geofenceExitHoldReason: decision.reason,
            });
          }
          if (decision.action === "hold_outside") {
            console.log("[AUTO-SIGN-OUT][location] outside_awaiting_confirmation", {
              attendanceId: String(row.id),
              operativeId: operativeIdLog,
              siteId: siteIdLog,
              reason: decision.reason,
            });
          } else if (decision.action === "sign_out") {
            const { data: imm, error: immErr } = await supabaseAdmin.rpc(
              "attendance_immediate_geofence_exit_sign_out",
              { p_attendance_id: String(row.id) }
            );
            const immOk =
              imm &&
              typeof imm === "object" &&
              (imm as Record<string, unknown>).ok === true;
            if (immErr || !immOk) {
              console.warn("[AUTO-SIGN-OUT][location] immediate_geofence_exit_sign_out_failed", {
                attendanceId: String(row.id),
                immErr,
                imm,
              });
            } else {
              console.log("[AUTO-SIGN-OUT][location] immediate_auto_sign_out", {
                attendanceId: String(row.id),
                operativeId: operativeIdLog,
                userId: uid,
                reason: "geofence_exit_immediate",
                triggerSource: "server_geofence",
                confirmReason: decision.reason,
              });
              await sendAttendanceAutoSignOutPush(uid, "geofence_exit_immediate", String(row.id));
              return NextResponse.json({
                ok: true,
                lastLocationTimestamp: lastTs,
                lastLocationOutsideFence: true,
                insideFence: r.insideFence ?? r.inside_fence,
                outsideThresholdMeters: outsideThresholdM,
                outsideClearanceMeters: r.outsideClearanceMeters ?? r.outside_clearance_meters,
                fallbackPing: fallbackPing || undefined,
                immediateAutoSignOut: true,
                autoSignOutReason: "geofence_exit_immediate",
                autoSignOutTriggerSource: "server_geofence",
              });
            }
          }
        }
        console.log("[attendance/location] ping stored", {
          attendanceId: String(row.id),
          operativeId: operativeIdLog,
          siteId: siteIdLog,
          lastLocationTimestamp: lastTs,
          lastLocationOutsideFence: outside,
          insideFence: r.insideFence ?? r.inside_fence,
          outsideThresholdMeters: outsideThresholdM,
          outsideClearanceMeters: r.outsideClearanceMeters ?? r.outside_clearance_meters,
          clientTimestamp: body.timestamp ?? body.timestampMillis,
          geofenceExitPing,
          fallbackPing,
        });
        return NextResponse.json({
          ok: true,
          lastLocationTimestamp: lastTs,
          lastLocationOutsideFence: outside,
          insideFence: r.insideFence ?? r.inside_fence,
          outsideThresholdMeters: outsideThresholdM,
          outsideClearanceMeters: r.outsideClearanceMeters ?? r.outside_clearance_meters,
          fallbackPing: fallbackPing || undefined,
        });
      }
      console.warn("[attendance/location] rpc returned ok!=true", { rpcData, rpcError });
    } else if (rpcError) {
      console.warn("[attendance/location] attendance_apply_location_ping failed, using legacy patch", rpcError);
    }

    const serverNow = new Date().toISOString();
    const patch: Record<string, unknown> = {
      last_location_lat: Number(lat),
      last_location_lng: Number(lng),
      last_location_timestamp: serverNow,
    };
    if (acc != null && Number.isFinite(acc)) patch.last_location_accuracy = acc;
    if (geofenceExitPing) patch.last_location_outside_fence = true;

    const { error: updErr } = await supabaseAdmin.from("attendance").update(patch).eq("id", row.id);
    if (updErr) {
      console.error("attendance location update:", updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (geofenceExitPing) {
      console.warn("[attendance/location] legacy_patch_geofence_exit_no_geometry_immediate_skipped", {
        attendanceId: String(row.id),
      });
    }

    console.log("[attendance/location] ping stored (legacy patch)", {
      attendanceId: String(row.id),
      operativeId: operativeIdLog,
      siteId: siteIdLog,
      lastLocationTimestamp: serverNow,
      lastLocationOutsideFence: geofenceExitPing ? true : null,
      geofenceExitPing,
    });

    return NextResponse.json({
      ok: true,
      lastLocationTimestamp: serverNow,
      lastLocationOutsideFence: geofenceExitPing ? true : null,
    });
  } catch (e: unknown) {
    console.error("POST /api/attendance/location failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
