import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  generateSignupLinkToken,
  generateSignupOtp,
  hashSignupLinkToken,
  hashSignupOtp,
  sendSignupVerificationEmail,
  signupOtpExpiresAt,
  signupVerifyUrl,
} from "@/lib/signupEmailVerification";
import {
  classifySignupStatus,
  findSignupsByEmail,
  signupOtpSentRecently,
  type SignupRegData,
} from "@/lib/signupRegistration";
import { verifyTurnstileToken } from "@/lib/verifyTurnstile";
import { getClientIp } from "@/lib/authAudit";
import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/passwordPolicy";
import { authUserExists, findAuthUserIdByEmail, findUserByIdOrEmail } from "@/lib/auth/findUser";

const VERIFY_MESSAGE =
  "Verify your email before an administrator can approve your account. Open the link in your email, or enter the 6-digit code.";

function verificationResponse(params: {
  id: string;
  companyId: string | null;
  inviteCode?: string | null;
  status?: number;
  error?: string;
}) {
  const res = NextResponse.json(
    {
      id: params.id,
      companyId: params.companyId,
      inviteCode: params.inviteCode ?? undefined,
      needsEmailVerification: true,
      message: params.error ? undefined : VERIFY_MESSAGE,
      error: params.error,
    },
    { status: params.status ?? 201 }
  );
  if (params.companyId) {
    res.cookies.set("companyId", String(params.companyId), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60,
    });
  }
  return res;
}

async function ensureUnconfirmedSignupUser(params: {
  email: string;
  password?: string;
  name: string | null;
  companyId: string | null;
  role: "admin" | "operative";
  existingAuthId?: string | null;
}): Promise<string | null> {
  let authId = params.existingAuthId?.trim() || null;
  try {
    if (authId && !(await authUserExists(authId))) authId = null;
    if (authId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authId, {
        ...(params.password ? { password: params.password } : {}),
        user_metadata: { name: params.name ?? undefined },
      });
      if (error) authId = null;
    }
    if (!authId) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: params.email,
        email_confirm: false,
        user_metadata: { name: params.name ?? undefined },
        ...(params.password ? { password: params.password } : {}),
      });
      if (!error && created?.user) {
        authId = created.user.id;
      } else if (error?.message?.includes("already been registered")) {
        authId = await findAuthUserIdByEmail(params.email);
        if (authId) {
          await supabaseAdmin.auth.admin.updateUserById(authId, {
            ...(params.password ? { password: params.password } : {}),
            user_metadata: { name: params.name ?? undefined },
          });
        }
      }
    }
  } catch (e) {
    console.error("ensureUnconfirmedSignupUser:", e);
  }
  if (!authId) return null;
  await supabaseAdmin.from("users").upsert(
    {
      id: authId,
      email: params.email,
      display_name: params.name ?? "",
      company_id: params.companyId,
      role: params.role,
      approved: false,
    },
    { onConflict: "id" }
  );
  return authId;
}

async function persistAndSendVerification(params: {
  registrationId: string;
  email: string;
  data: SignupRegData;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const otp = generateSignupOtp();
  const linkToken = generateSignupLinkToken();
  const nextData: SignupRegData = {
    ...params.data,
    status: "EMAIL_UNVERIFIED",
    emailVerified: false,
    emailOtpHash: hashSignupOtp(otp),
    emailLinkTokenHash: hashSignupLinkToken(linkToken),
    emailOtpExpiresAt: signupOtpExpiresAt(),
    emailOtpAttempts: 0,
    emailOtpLastSentAt: new Date().toISOString(),
  };
  await supabaseAdmin.from("registrations").update({ data: nextData }).eq("id", params.registrationId);
  const sent = await sendSignupVerificationEmail({
    email: params.email,
    code: otp,
    verifyUrl: signupVerifyUrl(linkToken),
  });
  if (!sent.ok) return { ok: false, error: sent.error || "Could not send verification email" };
  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email: rawEmail, name, companyName, companyCode, password: rawPassword, captchaToken } = body;

    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
    }

    const fromMobileApp = req.headers.get("x-client")?.trim().toLowerCase() === "mobile";
    if (!fromMobileApp) {
      const captcha = await verifyTurnstileToken(
        typeof captchaToken === "string" ? captchaToken : null,
        getClientIp(req)
      );
      if (!captcha.ok) {
        return NextResponse.json({ error: captcha.error }, { status: 400 });
      }
    }

    const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
    const password = typeof rawPassword === "string" && rawPassword ? rawPassword : undefined;
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });
    if (password && !isPasswordValid(password)) {
      return NextResponse.json({ error: PASSWORD_REQUIREMENTS_MESSAGE }, { status: 400 });
    }

    const { data: settingsRow } = await supabaseAdmin
      .from("settings")
      .select("config")
      .eq("id", "00000000-0000-0000-0000-000000000001")
      .single();
    const cfg = (settingsRow?.config as Record<string, unknown>) ?? {};
    const featureToggles = (cfg?.featureToggles as Record<string, unknown>) ?? {};
    const registrationsOpen = featureToggles?.registrationsOpen ?? cfg?.featureA ?? true;
    if (registrationsOpen === false) {
      return NextResponse.json(
        { error: "Registrations are currently closed. Please try again later." },
        { status: 403 }
      );
    }

    const existingSignups = await findSignupsByEmail(email);
    const pendingSignup = existingSignups.find((r) => classifySignupStatus(r.data.status) === "pending");
    if (pendingSignup) {
      return NextResponse.json(
        {
          id: pendingSignup.id,
          companyId: pendingSignup.company_id,
          pendingApproval: true,
          message: "This email is already waiting for administrator approval. You can sign in after they approve it.",
        },
        { status: 201 }
      );
    }
    const unverifiedSignup = existingSignups.find((r) => classifySignupStatus(r.data.status) === "unverified");
    const approvedSignup = existingSignups.find((r) => classifySignupStatus(r.data.status) === "approved");

    if (approvedSignup && !unverifiedSignup) {
      const liveUser = await findUserByIdOrEmail({ email });
      const liveAuthId = await findAuthUserIdByEmail(email);
      if (liveUser || liveAuthId) {
        return NextResponse.json(
          { error: "That email is already registered. Sign in, or use Forgot password if you need a new password." },
          { status: 409 }
        );
      }
    }

    if (unverifiedSignup) {
      const displayName =
        (typeof name === "string" && name.trim() ? name.trim() : unverifiedSignup.data.name) ?? null;
      const role = unverifiedSignup.data.role === "ADMIN" ? "admin" : "operative";
      const authId = await ensureUnconfirmedSignupUser({
        email,
        password,
        name: displayName,
        companyId: unverifiedSignup.company_id,
        role,
        existingAuthId: typeof unverifiedSignup.data.authUserId === "string" ? unverifiedSignup.data.authUserId : null,
      });
      const nextBase: SignupRegData = {
        ...unverifiedSignup.data,
        name: displayName,
        passwordSet: password ? true : unverifiedSignup.data.passwordSet === true,
        authUserId: authId ?? unverifiedSignup.data.authUserId,
      };
      if (signupOtpSentRecently(unverifiedSignup.data.emailOtpLastSentAt)) {
        return verificationResponse({
          id: unverifiedSignup.id,
          companyId: unverifiedSignup.company_id,
        });
      }
      const sent = await persistAndSendVerification({
        registrationId: unverifiedSignup.id,
        email,
        data: nextBase,
      });
      if (!sent.ok) {
        return verificationResponse({
          id: unverifiedSignup.id,
          companyId: unverifiedSignup.company_id,
          status: 502,
          error: sent.error,
        });
      }
      return verificationResponse({
        id: unverifiedSignup.id,
        companyId: unverifiedSignup.company_id,
      });
    }

    let companyId: string | null = null;
    let companyDoc: { name?: string; invite_code?: string } | null = null;

    if (companyCode && String(companyCode).trim()) {
      const normalizedCode = String(companyCode).trim().toUpperCase();
      const { data } = await supabaseAdmin
        .from("companies")
        .select("id, name, invite_code")
        .eq("invite_code", normalizedCode)
        .limit(1);
      if (!data?.length) return NextResponse.json({ error: "Invalid company code" }, { status: 400 });
      companyDoc = data[0];
      companyId = data[0].id;
    } else if (companyName) {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      const { data, error } = await supabaseAdmin
        .from("companies")
        .insert({ name: companyName, invite_code: inviteCode })
        .select("id, name, invite_code")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      companyId = data.id;
      companyDoc = { name: data.name, invite_code: data.invite_code };
    } else {
      return NextResponse.json({ error: "Company name or code required" }, { status: 400 });
    }

    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("company_id", companyId)
      .eq("role", "admin");
    const isFirstAdmin = !admins?.length;
    const pendingStatus = isFirstAdmin ? "COMPANY_ADMIN_PENDING" : "PENDING";
    const regRole = isFirstAdmin ? "ADMIN" : "OPERATIVE";
    const displayName = typeof name === "string" && name.trim() ? name.trim() : null;

    const otp = generateSignupOtp();
    const linkToken = generateSignupLinkToken();
    const baseData: SignupRegData = {
      email,
      name: displayName,
      companyName: companyDoc?.name ?? null,
      companyId,
      status: "EMAIL_UNVERIFIED",
      pendingStatus,
      role: regRole,
      emailVerified: false,
      passwordSet: !!password,
      emailOtpHash: hashSignupOtp(otp),
      emailLinkTokenHash: hashSignupLinkToken(linkToken),
      emailOtpExpiresAt: signupOtpExpiresAt(),
      emailOtpAttempts: 0,
      companyPhone: typeof body.companyPhone === "string" ? body.companyPhone : null,
      companyAddress: typeof body.companyAddress === "string" ? body.companyAddress : null,
    };

    const { data: reg, error: regErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        id: randomUUID(),
        company_id: companyId,
        data: baseData,
      })
      .select("id")
      .single();

    if (regErr || !reg) {
      console.error("registrations insert failed:", regErr?.message, regErr);
      return NextResponse.json(
        {
          error:
            regErr?.message?.trim() ||
            "Registration failed (could not save pending signup — check database registrations table).",
        },
        { status: 500 }
      );
    }

    const authUserId = await ensureUnconfirmedSignupUser({
      email,
      password,
      name: displayName,
      companyId,
      role: isFirstAdmin ? "admin" : "operative",
    });
    if (authUserId) {
      await supabaseAdmin
        .from("registrations")
        .update({ data: { ...baseData, authUserId } })
        .eq("id", reg.id);
    }

    const sent = await sendSignupVerificationEmail({
      email,
      code: otp,
      verifyUrl: signupVerifyUrl(linkToken),
    });
    if (!sent.ok) {
      return verificationResponse({
        id: reg.id,
        companyId,
        inviteCode: companyDoc?.invite_code,
        status: 502,
        error: sent.error || "Could not send verification email",
      });
    }

    const sentAt = new Date().toISOString();
    const { data: freshRow } = await supabaseAdmin.from("registrations").select("data").eq("id", reg.id).maybeSingle();
    const fresh = (freshRow?.data ?? {}) as SignupRegData;
    if (fresh.status === "EMAIL_UNVERIFIED") {
      await supabaseAdmin
        .from("registrations")
        .update({ data: { ...fresh, emailOtpLastSentAt: sentAt } })
        .eq("id", reg.id)
        .filter("data->>status", "eq", "EMAIL_UNVERIFIED");
    }

    return verificationResponse({
      id: reg.id,
      companyId,
      inviteCode: companyDoc?.invite_code,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
