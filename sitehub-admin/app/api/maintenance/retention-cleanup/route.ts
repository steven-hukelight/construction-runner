/**
 * GDPR Data Retention Cleanup. Call via cron.
 * Set CRON_SECRET in env; Vercel cron sends Authorization: Bearer <CRON_SECRET>.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const INDUCTION_RETENTION_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;
const RAMS_RETENTION_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const role = (await cookies()).get("role")?.value;

    const allowedByCron = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const allowedBySuperuser = role === "superuser";

    if (!allowedByCron && !allowedBySuperuser) {
      return NextResponse.json({ error: "Unauthorized: CRON_SECRET or superuser required" }, { status: 401 });
    }

    const now = Date.now();
    const inductionCutoff = new Date(now - INDUCTION_RETENTION_MS).toISOString();
    const ramsCutoff = new Date(now - RAMS_RETENTION_MS).toISOString();
    const result = { inductionDeleted: 0, ramsCleared: 0, errors: [] as string[] };

    const { data: inductions } = await supabaseAdmin.from("user_site_inductions").select("user_id, site_id, completed_at");
    for (const ind of inductions ?? []) {
      const completedAt = ind.completed_at ?? "";
      if (completedAt && completedAt < inductionCutoff) {
        await supabaseAdmin.from("user_site_inductions").delete().eq("user_id", ind.user_id).eq("site_id", ind.site_id);
        result.inductionDeleted++;
      }
    }

    const { data: trainingRows } = await supabaseAdmin.from("pre_induction_training").select("user_id, rams_accepted_at");
    for (const row of trainingRows ?? []) {
      const ramsAcceptedAt = (row as { rams_accepted_at?: string }).rams_accepted_at;
      if (ramsAcceptedAt && ramsAcceptedAt < ramsCutoff) {
        await supabaseAdmin.from("pre_induction_training").update({
          rams_accepted: false,
          rams_accepted_at: null,
          rams_version: null,
          rams_required_version: null,
          updated_at: new Date().toISOString(),
        }).eq("user_id", row.user_id);
        result.ramsCleared++;
      }
    }

    return NextResponse.json({ success: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    console.error("Retention cleanup failed:", e);
    return NextResponse.json({ error: "Retention cleanup failed" }, { status: 500 });
  }
}
