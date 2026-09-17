import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerPublicOrigin } from "@/lib/url";
import { provisionLegacyUser } from "@/lib/provisionLegacyUser";
import { recoveryPageUrl, sendRecoveryEmail } from "@/lib/sendPasswordReset";

/** Sends a password reset email. Superuser or ADMIN only. */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    let role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower !== "superuser" && roleLower !== "admin") {
      const userEmail = cookieStore.get("user_email")?.value?.trim();
      if (userEmail) {
        const { data: user } = await supabaseAdmin.from("users").select("role").eq("email", userEmail).maybeSingle();
        const dbRole = (user?.role ?? "").toLowerCase();
        if (dbRole === "superuser" || dbRole === "admin") role = dbRole;
      }
    }
    const effectiveRole = (role ?? "").toLowerCase();
    if (effectiveRole !== "superuser" && effectiveRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    let email: string | null = body.email?.trim() || null;
    const userId = body.userId?.trim();

    if (!email && userId) {
      const { data: user } = await supabaseAdmin.from("users").select("email").eq("id", userId).maybeSingle();
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
      email = user.email?.trim() || null;
    }

    if (!email) return NextResponse.json({ error: "Email or userId required" }, { status: 400 });

    if (userId) {
      const authUser = (await supabaseAdmin.auth.admin.getUserById(userId)).data?.user;
      if (!authUser) {
        const { data: dbUser } = await supabaseAdmin
          .from("users")
          .select("id, email, display_name, company_id, role, name, phone, superuser, approved")
          .eq("id", userId)
          .maybeSingle();
        if (dbUser?.email) {
          const result = await provisionLegacyUser(dbUser);
          if ("error" in result) {
            return NextResponse.json({ error: result.error }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            error: "User not found in authentication. They may have been created before Supabase Auth was enabled.",
          }, { status: 404 });
        }
      } else if ((authUser.email ?? "").toLowerCase() !== email.toLowerCase()) {
        email = authUser.email ?? email;
      }
    }

    const redirectUrl = recoveryPageUrl(getServerPublicOrigin());

    if (!redirectUrl.startsWith("http")) {
      console.error("send-password-reset: Invalid base URL. Set NEXT_PUBLIC_BASE_URL or NEXTAUTH_URL.");
      return NextResponse.json(
        { error: "Server misconfiguration: base URL not set. Add NEXT_PUBLIC_BASE_URL to env." },
        { status: 500 }
      );
    }

    try {
      await sendRecoveryEmail(email, redirectUrl);
      return NextResponse.json({ ok: true, message: "Password reset email sent." });
    } catch (err: unknown) {
      const e = err as { message?: string };
      const msg = (e?.message ?? "").toLowerCase();
      if (msg.includes("user not found") || msg.includes("user-not-found")) {
        return NextResponse.json({ error: "No user with this email in the system." }, { status: 404 });
      }
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        return NextResponse.json({
          error: "User email is not confirmed. They may need to complete sign-up first.",
        }, { status: 400 });
      }
      console.error("send-password-reset failed", err);
      return NextResponse.json({
        error: "Failed to send password reset email. The user may not exist in authentication. Check server logs.",
      }, { status: 500 });
    }
  } catch (err) {
    console.error("send-password-reset failed", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
