import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  generateSignupOtp,
  hashSignupOtp,
  sendSignupVerificationEmail,
  signupOtpExpiresAt,
} from "@/lib/signupEmailVerification";

type RegData = {
  email?: string;
  status?: string;
  emailVerified?: boolean;
  emailOtpHash?: string;
  emailOtpExpiresAt?: string;
  emailOtpAttempts?: number;
  emailOtpLastSentAt?: string;
};

function copyOtpField<K extends keyof RegData>(
  target: RegData,
  source: RegData,
  key: K
) {
  if (source[key] == null) delete target[key];
  else target[key] = source[key];
}

/** Put the previous code back if this resend's email never went out. */
async function restoreUndeliveredSignupOtp(params: {
  registrationId: string;
  writtenHash: string;
  previous: RegData;
}): Promise<boolean> {
  const { data: freshRow, error: readError } = await supabaseAdmin
    .from("registrations")
    .select("data")
    .eq("id", params.registrationId)
    .maybeSingle();
  if (readError || !freshRow) return false;

  const fresh = (freshRow.data ?? {}) as RegData;
  if (fresh.status !== "EMAIL_UNVERIFIED" || fresh.emailOtpHash !== params.writtenHash) {
    return true;
  }

  const restored: RegData = { ...fresh };
  copyOtpField(restored, params.previous, "emailOtpHash");
  copyOtpField(restored, params.previous, "emailOtpExpiresAt");
  copyOtpField(restored, params.previous, "emailOtpAttempts");
  copyOtpField(restored, params.previous, "emailOtpLastSentAt");

  const { data: rolled, error: rollbackError } = await supabaseAdmin
    .from("registrations")
    .update({ data: restored })
    .eq("id", params.registrationId)
    .filter("data->>status", "eq", "EMAIL_UNVERIFIED")
    .filter("data->>emailOtpHash", "eq", params.writtenHash)
    .select("id");
  if (!rollbackError && rolled?.length) return true;

  const invalidated: RegData = { ...fresh };
  delete invalidated.emailOtpHash;
  delete invalidated.emailOtpExpiresAt;
  const { error: invalidateError } = await supabaseAdmin
    .from("registrations")
    .update({ data: invalidated })
    .eq("id", params.registrationId)
    .filter("data->>status", "eq", "EMAIL_UNVERIFIED")
    .filter("data->>emailOtpHash", "eq", params.writtenHash);
  if (invalidateError) {
    console.error("resend-code invalidate error", invalidateError);
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const registrationId = typeof body.registrationId === "string" ? body.registrationId.trim() : "";
    if (!registrationId) {
      return NextResponse.json({ error: "Registration id required" }, { status: 400 });
    }

    const { data: regRow } = await supabaseAdmin
      .from("registrations")
      .select("id, data")
      .eq("id", registrationId)
      .maybeSingle();

    if (!regRow) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const data = (regRow.data ?? {}) as RegData;
    if (data.emailVerified === true || data.status !== "EMAIL_UNVERIFIED") {
      return NextResponse.json({ error: "Email already verified or not awaiting code" }, { status: 400 });
    }

    const email = (data.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "No email on registration" }, { status: 400 });
    }

    const last = data.emailOtpLastSentAt ? new Date(data.emailOtpLastSentAt).getTime() : 0;
    if (Number.isFinite(last) && Date.now() - last < 60_000) {
      return NextResponse.json({ error: "Please wait a minute before requesting another code" }, { status: 429 });
    }

    const otp = generateSignupOtp();
    const writtenHash = hashSignupOtp(otp);
    const nextData: RegData = {
      ...data,
      emailOtpHash: writtenHash,
      emailOtpExpiresAt: signupOtpExpiresAt(),
      emailOtpAttempts: 0,
      emailOtpLastSentAt: new Date().toISOString(),
    };

    const previousSentAt =
      typeof data.emailOtpLastSentAt === "string" && data.emailOtpLastSentAt.trim()
        ? data.emailOtpLastSentAt
        : null;
    const statusGuarded = supabaseAdmin
      .from("registrations")
      .update({ data: nextData })
      .eq("id", registrationId)
      .filter("data->>status", "eq", "EMAIL_UNVERIFIED");
    const compareAndSwap = previousSentAt
      ? statusGuarded.filter("data->>emailOtpLastSentAt", "eq", previousSentAt)
      : statusGuarded.filter("data->>emailOtpLastSentAt", "is", null);
    const { data: updatedRows, error: updateError } = await compareAndSwap.select("id");
    if (updateError) {
      console.error("resend-code persist error", updateError);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
    if (!updatedRows?.length) {
      const { data: latest } = await supabaseAdmin
        .from("registrations")
        .select("data")
        .eq("id", registrationId)
        .maybeSingle();
      const latestStatus = ((latest?.data ?? {}) as RegData).status;
      if (latestStatus && latestStatus !== "EMAIL_UNVERIFIED") {
        return NextResponse.json(
          { error: "Email already verified or not awaiting code" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Please wait a minute before requesting another code" },
        { status: 429 }
      );
    }

    const sent = await sendSignupVerificationEmail(email, otp);
    if (!sent.ok) {
      const rolledBack = await restoreUndeliveredSignupOtp({
        registrationId,
        writtenHash,
        previous: data,
      });
      if (!rolledBack) {
        console.error("resend-code failed to roll back undelivered code", registrationId);
      }
      return NextResponse.json({ error: sent.error || "Failed to send email" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: "Verification code sent" });
  } catch (e) {
    console.error("resend-code error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
