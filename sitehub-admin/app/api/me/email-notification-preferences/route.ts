import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const MANAGER_ROLES = new Set(["admin", "supervisor", "sub_admin"]);

function parsePrefs(raw: unknown): { operativePendingApproval: boolean } {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    operativePendingApproval: o.operativePendingApproval !== false,
  };
}

/** GET — current user's email notification preferences (admin/supervisor/sub_admin). */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("role, email_notification_preferences")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rl = String(user.role ?? "").toLowerCase();
    if (!MANAGER_ROLES.has(rl)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(parsePrefs(user.email_notification_preferences));
  } catch (e) {
    console.error("GET /api/me/email-notification-preferences failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** PATCH — update operative pending approval email preference. */
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value;
    if (!email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: user } = await supabaseAdmin
      .from("users")
      .select("id, role, email_notification_preferences")
      .eq("email", email)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const rl = String(user.role ?? "").toLowerCase();
    if (!MANAGER_ROLES.has(rl)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const v = body?.operativePendingApproval;
    if (typeof v !== "boolean") {
      return NextResponse.json({ error: "operativePendingApproval (boolean) required" }, { status: 400 });
    }

    const existing =
      user.email_notification_preferences && typeof user.email_notification_preferences === "object"
        ? { ...(user.email_notification_preferences as Record<string, unknown>) }
        : {};
    existing.operativePendingApproval = v;

    const { error } = await supabaseAdmin
      .from("users")
      .update({ email_notification_preferences: existing })
      .eq("id", user.id);

    if (error) {
      console.error("PATCH email-notification-preferences:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json(parsePrefs(existing));
  } catch (e) {
    console.error("PATCH /api/me/email-notification-preferences failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
