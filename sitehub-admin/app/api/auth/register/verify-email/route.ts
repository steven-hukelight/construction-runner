import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashSignupLinkToken, verifySignupOtpHash } from "@/lib/signupEmailVerification";
import { completeSignupEmailVerification } from "@/lib/completeSignupEmailVerification";
import {
  findUnverifiedSignupByEmail,
  type SignupRegData,
  type SignupRegRow,
} from "@/lib/signupRegistration";
import { getServerPublicOrigin } from "@/lib/url";

async function loadRegistration(params: {
  registrationId?: string;
  emailHint?: string;
}): Promise<SignupRegRow | null> {
  if (params.registrationId) {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .select("id, company_id, data")
      .eq("id", params.registrationId)
      .maybeSingle();
    if (!error && data) {
      return { id: data.id, company_id: data.company_id, data: (data.data ?? {}) as SignupRegData };
    }
  }
  if (params.emailHint) {
    const found = await findUnverifiedSignupByEmail(params.emailHint);
    if (found) return found;
  }
  return null;
}

function registerRedirect(query: string) {
  return NextResponse.redirect(`${getServerPublicOrigin().replace(/\/$/, "")}/register?${query}`);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim().toLowerCase() ?? "";
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return registerRedirect("verifyError=invalid");
  }
  const hash = hashSignupLinkToken(token);
  const { data } = await supabaseAdmin
    .from("registrations")
    .select("id, company_id, data")
    .filter("data->>emailLinkTokenHash", "eq", hash)
    .maybeSingle();
  if (!data) return registerRedirect("verifyError=invalid");

  const regRow: SignupRegRow = {
    id: data.id,
    company_id: data.company_id,
    data: (data.data ?? {}) as SignupRegData,
  };
  const expiresAt = regRow.data.emailOtpExpiresAt;
  const exp = expiresAt ? new Date(expiresAt).getTime() : NaN;
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return registerRedirect("verifyError=expired");
  }

  try {
    const result = await completeSignupEmailVerification(regRow);
    return registerRedirect(result.alreadyVerified ? "verified=1" : "verified=1");
  } catch {
    return registerRedirect("verifyError=invalid");
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    const emailHint = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit code from your email" }, { status: 400 });
    }
    if (!registrationId && !emailHint) {
      return NextResponse.json({ error: "Registration id or email required" }, { status: 400 });
    }

    const regRow = await loadRegistration({ registrationId, emailHint });
    if (!regRow) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const data = (regRow.data ?? {}) as SignupRegData;
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
        .eq("id", regRow.id);
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const result = await completeSignupEmailVerification(regRow);
    return NextResponse.json({
      ok: true,
      status: result.nextStatus,
      alreadyVerified: result.alreadyVerified,
      message: result.message,
    });
  } catch (e) {
    console.error("verify-email error", e);
    const status = typeof e === "object" && e && "status" in e ? Number((e as { status?: number }).status) : 500;
    return NextResponse.json(
      { error: status === 400 ? (e as Error).message : "Server error" },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}
