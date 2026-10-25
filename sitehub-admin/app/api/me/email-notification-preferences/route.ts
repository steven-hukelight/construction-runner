import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import {
  MANAGER_ONLY_PREFERENCE_KEYS,
  mergePreferences,
  parseNotificationPreferences,
  pickPreferencePatch,
} from "@/lib/notificationPreferences";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = new Set(["admin", "supervisor", "sub_admin"]);

type PrefsUser = { id: string; role: string | null; email_notification_preferences: unknown };

/** Signed-in user from a web session cookie or a mobile Bearer token. */
async function loadCurrentUser(req: Request): Promise<PrefsUser | null> {
  const auth = await resolvePreInductionAuth({ req });
  const cols = "id, role, email_notification_preferences";
  if (auth.uid) {
    const { data } = await supabaseAdmin.from("users").select(cols).eq("id", auth.uid).maybeSingle();
    if (data) return data as PrefsUser;
  }
  const cookieStore = await cookies();
  const email = auth.userEmail ?? cookieStore.get("user_email")?.value;
  if (!email) return null;
  const { data } = await supabaseAdmin.from("users").select(cols).eq("email", email.trim()).maybeSingle();
  return (data as PrefsUser | null) ?? null;
}

/** GET — current user's notification preferences. */
export async function GET(req: Request) {
  try {
    const user = await loadCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(parseNotificationPreferences(user.email_notification_preferences));
  } catch (e) {
    console.error("GET /api/me/email-notification-preferences failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH — update one or more preferences.
 * `assetInspectionReminders`: any signed-in user. `operativePendingApproval`: managers only.
 */
export async function PATCH(req: Request) {
  try {
    const user = await loadCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const picked = pickPreferencePatch(body);
    if ("error" in picked) {
      return NextResponse.json({ error: picked.error }, { status: 400 });
    }

    const isManager = MANAGER_ROLES.has(String(user.role ?? "").toLowerCase());
    const needsManager = Object.keys(picked.patch).some((k) =>
      MANAGER_ONLY_PREFERENCE_KEYS.has(k as keyof typeof picked.patch),
    );
    if (needsManager && !isManager) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const next = mergePreferences(user.email_notification_preferences, picked.patch);
    const { error } = await supabaseAdmin
      .from("users")
      .update({ email_notification_preferences: next })
      .eq("id", user.id);

    if (error) {
      console.error("PATCH email-notification-preferences:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json(parseNotificationPreferences(next));
  } catch (e) {
    console.error("PATCH /api/me/email-notification-preferences failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
