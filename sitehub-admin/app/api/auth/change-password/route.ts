/**
 * POST /api/auth/change-password
 * Signed-in web user changes their own password. Body: { currentPassword, newPassword }
 * The current password is re-verified with Supabase Auth before the new one is set.
 */
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkLoginRateLimit } from "@/lib/rateLimit";
import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/passwordPolicy";
import { writeAuditLog } from "@/lib/auditLog";

export async function POST(req: Request) {
  const { success, retryAfter } = await checkLoginRateLimit(req);
  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined }
    );
  }

  try {
    const cookieStore = await cookies();
    const email = cookieStore.get("user_email")?.value?.trim();
    if (!email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Current and new password are required." }, { status: 400 });
    }
    if (!isPasswordValid(newPassword)) {
      return NextResponse.json({ error: PASSWORD_REQUIREMENTS_MESSAGE }, { status: 400 });
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from your current password." },
        { status: 400 }
      );
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const supabaseAuth = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password: currentPassword,
    });
    const authUserId = authData?.user?.id;
    if (authError || !authUserId) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });
    if (updateError) {
      console.error("change-password updateUserById failed", updateError);
      return NextResponse.json({ error: "Could not change password. Please try again." }, { status: 500 });
    }

    await writeAuditLog({
      userId: authUserId,
      action: "password_change",
      timestamp: new Date(),
      actorId: authUserId,
      actorEmail: email,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("change-password failed", err);
    return NextResponse.json({ error: "Could not change password. Please try again." }, { status: 500 });
  }
}
