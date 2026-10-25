/**
 * Attendance alert settings for the signed-in admin, site admin or supervisor.
 *
 * GET   -> { eligible, attendance, sites: [{ id, name }] }
 * PATCH { attendance: { ...partial } } -> same shape as GET
 *
 * Auth: cookie session or Bearer token (mobile).
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { usesAssignedSites } from "@/lib/auth/roles";
import {
  applyAttendanceAlertPatch,
  canReceiveAttendanceAlerts,
  parseAttendanceAlertPreferences,
  withAttendancePreferences,
} from "@/lib/attendanceAlerts/preferences";

export const dynamic = "force-dynamic";

type PrefsUser = { id: string; role: string | null; company_id: string | null; notification_preferences: unknown };

const COLUMNS = "id, role, company_id, notification_preferences";

async function loadCurrentUser(req: Request): Promise<PrefsUser | null> {
  const auth = await resolvePreInductionAuth({ req });
  if (auth.uid) {
    const { data } = await supabaseAdmin.from("users").select(COLUMNS).eq("id", auth.uid).maybeSingle();
    if (data) return data as PrefsUser;
  }
  const email = auth.userEmail ?? (await cookies()).get("user_email")?.value;
  if (!email) return null;
  const { data } = await supabaseAdmin.from("users").select(COLUMNS).eq("email", email.trim()).maybeSingle();
  return (data as PrefsUser | null) ?? null;
}

/** Sites this person can get alerts for: every company site for admins, assigned sites otherwise. */
async function visibleSites(user: PrefsUser): Promise<{ id: string; name: string }[]> {
  const companyId = (user.company_id ?? "").trim();
  if (!companyId) return [];
  let query = supabaseAdmin.from("sites").select("id, name").eq("company_id", companyId).order("name");
  if (usesAssignedSites(user.role)) {
    const { data: links } = await supabaseAdmin.from("user_sites").select("site_id").eq("user_id", user.id);
    const ids = (links ?? []).map((r) => String((r as { site_id: string }).site_id));
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({
    id: String((s as { id: string }).id),
    name: String((s as { name?: string | null }).name ?? "").trim() || "Unnamed site",
  }));
}

function notEligible() {
  return NextResponse.json({ error: "Attendance alerts are for admins, site admins and supervisors" }, { status: 403 });
}

export async function GET(req: Request) {
  try {
    const user = await loadCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const eligible = canReceiveAttendanceAlerts(user.role);
    return NextResponse.json({
      eligible,
      attendance: parseAttendanceAlertPreferences(user.notification_preferences),
      sites: eligible ? await visibleSites(user) : [],
    });
  } catch (e) {
    console.error("GET /api/me/notification-preferences failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await loadCurrentUser(req);
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    if (!canReceiveAttendanceAlerts(user.role)) return notEligible();

    const body = (await req.json().catch(() => ({}))) as { attendance?: unknown };
    if (!body.attendance || typeof body.attendance !== "object") {
      return NextResponse.json({ error: "Provide attendance settings to update" }, { status: 400 });
    }

    const sites = await visibleSites(user);
    const current = parseAttendanceAlertPreferences(user.notification_preferences);
    const applied = applyAttendanceAlertPatch(current, body.attendance, new Set(sites.map((s) => s.id)));
    if ("error" in applied) return NextResponse.json({ error: applied.error }, { status: 400 });

    const next = withAttendancePreferences(user.notification_preferences, applied.value);
    const { error } = await supabaseAdmin.from("users").update({ notification_preferences: next }).eq("id", user.id);
    if (error) {
      console.error("PATCH notification-preferences:", error);
      return NextResponse.json({ error: "Could not save settings" }, { status: 500 });
    }

    return NextResponse.json({ eligible: true, attendance: applied.value, sites });
  } catch (e) {
    console.error("PATCH /api/me/notification-preferences failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
