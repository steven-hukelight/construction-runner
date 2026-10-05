import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifySignupOtpHash } from "@/lib/signupEmailVerification";
import { notifyAdminsOperativePendingSignup } from "@/lib/notifyAdminPendingOperative";

type RegData = {
  email?: string;
  name?: string | null;
  companyName?: string | null;
  companyId?: string | null;
  status?: string;
  pendingStatus?: string;
  role?: string;
  emailVerified?: boolean;
  emailOtpHash?: string;
  emailOtpExpiresAt?: string;
  emailOtpAttempts?: number;
  authUserId?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!registrationId || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Registration id and 6-digit code required" }, { status: 400 });
    }

    const { data: regRow, error } = await supabaseAdmin
      .from("registrations")
      .select("id, company_id, data")
      .eq("id", registrationId)
      .maybeSingle();

    if (error || !regRow) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const data = (regRow.data ?? {}) as RegData;
    if (data.emailVerified === true || data.status === "PENDING" || data.status === "COMPANY_ADMIN_PENDING") {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }
    if (data.status !== "EMAIL_UNVERIFIED") {
      return NextResponse.json({ error: "This registration cannot be verified" }, { status: 400 });
    }

    const check = verifySignupOtpHash({
      code,
      hash: data.emailOtpHash,
      expiresAt: data.emailOtpExpiresAt,
      attempts: data.emailOtpAttempts,
    });

    if (!check.ok) {
      const attempts = (data.emailOtpAttempts ?? 0) + 1;
      await supabaseAdmin
        .from("registrations")
        .update({
          data: { ...data, emailOtpAttempts: attempts },
        })
        .eq("id", registrationId);
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const nextStatus =
      data.pendingStatus === "COMPANY_ADMIN_PENDING" || data.role === "ADMIN"
        ? "COMPANY_ADMIN_PENDING"
        : "PENDING";

    const cleared: RegData = {
      ...data,
      status: nextStatus,
      emailVerified: true,
      emailOtpHash: undefined,
      emailOtpExpiresAt: undefined,
      emailOtpAttempts: 0,
      emailVerifiedAt: new Date().toISOString(),
    } as RegData & { emailVerifiedAt: string };

    // Strip OTP secrets from stored JSON
    delete (cleared as { emailOtpHash?: string }).emailOtpHash;
    delete (cleared as { emailOtpExpiresAt?: string }).emailOtpExpiresAt;

    await supabaseAdmin.from("registrations").update({ data: cleared }).eq("id", registrationId);

    const email = (data.email ?? "").trim().toLowerCase();
    let authUserId = data.authUserId ?? null;
    if (!authUserId && email) {
      const { data: u } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
      authUserId = u?.id ?? null;
    }
    if (authUserId) {
      await supabaseAdmin.auth.admin.updateUserById(authUserId, { email_confirm: true });
    }

    // Now that email is proven, put them in the admin approval queue.
    if (nextStatus === "PENDING" && regRow.company_id) {
      void notifyAdminsOperativePendingSignup({
        companyId: String(regRow.company_id),
        companyName: data.companyName ?? null,
        operativeName: typeof data.name === "string" ? data.name : null,
        operativeEmail: email,
        registrationId,
      }).catch((e) => console.error("notifyAdminsOperativePendingSignup:", e));
    }

    return NextResponse.json({
      ok: true,
      status: nextStatus,
      message:
        nextStatus === "COMPANY_ADMIN_PENDING"
          ? "Email verified. Your new company request is pending approval."
          : "Email verified. Your account request is pending approval.",
    });
  } catch (e) {
    console.error("verify-email error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
