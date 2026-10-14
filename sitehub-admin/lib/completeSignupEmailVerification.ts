import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { notifyAdminsOperativePendingSignup } from "@/lib/notifyAdminPendingOperative";
import type { SignupRegData, SignupRegRow } from "@/lib/signupRegistration";

export function pendingStatusForSignup(data: SignupRegData): "PENDING" | "COMPANY_ADMIN_PENDING" {
  return data.pendingStatus === "COMPANY_ADMIN_PENDING" || data.role === "ADMIN"
    ? "COMPANY_ADMIN_PENDING"
    : "PENDING";
}

export function signupVerifiedMessage(status: string): string {
  return status === "COMPANY_ADMIN_PENDING"
    ? "Email verified. Your new company request is pending approval."
    : "Email verified. Your administrator must approve the account before you can sign in.";
}

export async function completeSignupEmailVerification(
  regRow: SignupRegRow
): Promise<{ alreadyVerified: boolean; nextStatus: string; message: string }> {
  const data = (regRow.data ?? {}) as SignupRegData;
  if (
    data.emailVerified === true ||
    data.status === "PENDING" ||
    data.status === "COMPANY_ADMIN_PENDING"
  ) {
    const nextStatus = data.status === "COMPANY_ADMIN_PENDING" ? "COMPANY_ADMIN_PENDING" : "PENDING";
    return {
      alreadyVerified: true,
      nextStatus,
      message: signupVerifiedMessage(nextStatus),
    };
  }
  if (data.status !== "EMAIL_UNVERIFIED") {
    const err = new Error("This registration cannot be verified") as Error & { status?: number };
    err.status = 400;
    throw err;
  }

  const nextStatus = pendingStatusForSignup(data);
  const cleared: SignupRegData = {
    ...data,
    status: nextStatus,
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    emailOtpAttempts: 0,
  };
  delete cleared.emailOtpHash;
  delete cleared.emailOtpExpiresAt;
  delete cleared.emailLinkTokenHash;

  await supabaseAdmin.from("registrations").update({ data: cleared }).eq("id", regRow.id);

  const email = (data.email ?? "").trim().toLowerCase();
  let authUserId = typeof data.authUserId === "string" ? data.authUserId : null;
  if (!authUserId && email) {
    const { data: u } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
    authUserId = u?.id ?? null;
  }
  if (authUserId) {
    await supabaseAdmin.auth.admin.updateUserById(authUserId, { email_confirm: true });
    await supabaseAdmin.from("users").update({ approved: false }).eq("id", authUserId);
  }

  if (nextStatus === "PENDING" && regRow.company_id) {
    void notifyAdminsOperativePendingSignup({
      companyId: String(regRow.company_id),
      companyName: data.companyName ?? null,
      operativeName: typeof data.name === "string" ? data.name : null,
      operativeEmail: email,
      registrationId: regRow.id,
    }).catch((e) => console.error("notifyAdminsOperativePendingSignup:", e));
  }

  return {
    alreadyVerified: false,
    nextStatus,
    message: signupVerifiedMessage(nextStatus),
  };
}
