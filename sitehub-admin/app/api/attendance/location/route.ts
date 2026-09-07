import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { sendAttendanceAutoSignOutPush } from "@/lib/attendanceAutoSignOutPush";

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
    const operativeIdForAuth =
      operativeIdLog != null && String(operativeIdLog).trim() !== ""
        ? String(operativeIdLog).trim()
        : null;
    const siteIdLog = body.siteId ?? body.site_id ?? null;

    if (!attendanceId || lat == null || lng == null) {
      return NextResponse.json(
        { error: "attendanceId, lat, and lng required" },
        { status: 400 }
      );
    }

    // Same pattern as POST /api/attendance: mobile often has no dashboard cookies but sends operativeId in body.
    const mobileAuth = await resolvePreInductionAuth({
      req,
      uidFromBody: operativeIdForAuth,
    });
    const authHeader = req.headers.get("authorization");
    const hasBearer = authHeader?.toLowerCase().startsWith("bearer ") ?? false;

    const { data: row, error: fetchErr } = await supabaseAdmin
      .from("attendance")
      .select("id, user_id, action")
      .eq("id", String(attendanceId))
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: "Attendance session not found" }, { status: 404 });
    }

    const uid = String((row as { user_id: string }).user_id);

    if (hasBearer) {
      // With uidFromBody, invalid/expired Bearer still yields mobileAuth.uid from body (same trust as POST /attendance).
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
      } else if (operativeIdForAuth && uid === operativeIdForAuth) {
        // Mobile without Authorization header: body operative id must match this attendance row.
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

    const acc = body.accuracy != null && body.accuracy !== "" ? Number(body.accuracy) : null;
    const pAcc = acc != null && Number.isFinite(acc) ? acc : 0;

    const geofenceExitPing =
      body.geofenceExit === true ||
      body.geofence_exit === true ||
      body.outsideFence === true ||
      body.outside_fence === true;

    const fallbackPing = body.fallbackPing === true || body.fallback_ping === true;
    const maxFallbackAccuracyM = 120;
    const maxFallbackAgeMs = 15 * 60 * 1000;
    const clientTsRaw = body.timestampMillis ?? body.timestamp_millis;
    const clientTs = clientTsRaw != null && clientTsRaw !== "" ? Number(clientTsRaw) : NaN;
    const clientAgeOk =
      !Number.isFinite(clientTs) || Math.abs(Date.now() - clientTs) <= maxFallbackAgeMs;

    if (fallbackPing && (pAcc > maxFallbackAccuracyM || !clientAgeOk)) {
      const serverNow = new Date().toISOString();
      const patch: Record<string, unknown> = {
        last_location_lat: Number(lat),
        last_location_lng: Number(lng),
        last_location_timestamp: serverNow,
      };
      if (acc != null && Number.isFinite(acc)) patch.last_location_accuracy = acc;
      const { error: updErr } = await supabaseAdmin.from("attendance").update(patch).eq("id", row.id);
      if (updErr) {
        console.error("[attendance/location] fallback ping location-only update:", updErr);
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      console.log("[attendance/location] fallback ping stored (skipped outside eval)", {
        attendanceId: String(row.id),
        accuracy: pAcc,
        clientAgeOk,
        reason: pAcc > maxFallbackAccuracyM ? "accuracy" : "stale_timestamp",
      });
      return NextResponse.json({
        ok: true,
        lastLocationTimestamp: serverNow,
        fallbackPing: true,
        skippedOutsideEval: true,
        skipped_outside_eval: true,
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
        if (geofenceExitPing && outside) {
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
