/**
 * Optional manual / legacy trigger: runs the same DB logic as pg_cron `perform_attendance_fallback`,
 * then drains the push queue (OneSignal). Primary schedule is Supabase pg_cron + Vercel dispatch cron.
 *
 * DB logic uses latest open SIGN_IN per user (created_at / timestamp ordering) and a 25s stale threshold
 * — see `ATTENDANCE_FALLBACK_STALE_MS` and migrations `*attendance_fallback*`.
 */

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  ATTENDANCE_FALLBACK_STALE_MS,
  AUTO_SIGN_OUT_TIMEOUT_MS,
} from "@/lib/attendanceFallbackConstants";
import { dispatchPendingAttendancePushNotifications } from "@/lib/dispatchAttendancePushQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request): Promise<NextResponse> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized: Bearer CRON_SECRET required" }, { status: 401 });
  }

  const started = Date.now();
  console.log("[AUTO-SIGN-OUT] maintenance invoking perform_attendance_fallback", {
    now: started,
    timeoutThresholdMs: AUTO_SIGN_OUT_TIMEOUT_MS,
    staleThresholdMs: ATTENDANCE_FALLBACK_STALE_MS,
    note: "Per-row diagnostics are emitted from Postgres as [AUTO-SIGN-OUT][FALLBACK] (RAISE LOG — check Supabase Postgres logs).",
  });

  const { error: rpcErr } = await supabaseAdmin.rpc("perform_attendance_fallback");
  if (rpcErr) {
    console.error("[AUTO-SIGN-OUT] perform_attendance_fallback RPC failed:", rpcErr);
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  const elapsedMs = Date.now() - started;
  console.log("[AUTO-SIGN-OUT] perform_attendance_fallback finished OK", {
    elapsedMs,
    hint: "If no row matched, every latest open SIGN_IN user still logs NOT TRIGGERED with a reason in Postgres logs.",
  });

  const push = await dispatchPendingAttendancePushNotifications(80);
  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    staleThresholdMs: ATTENDANCE_FALLBACK_STALE_MS,
    push,
  });
}

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}
