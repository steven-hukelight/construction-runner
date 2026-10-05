import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  generateSignupOtp,
  hashSignupOtp,
  sendSignupVerificationEmail,
  signupOtpExpiresAt,
} from "@/lib/signupEmailVerification";
import { verifyTurnstileToken } from "@/lib/verifyTurnstile";
import { getClientIp } from "@/lib/authAudit";
import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/passwordPolicy";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email: rawEmail, name, companyName, companyCode, password: rawPassword, captchaToken } = body;

    // Honeypot — bots often fill hidden "website" fields
    if (typeof body.website === "string" && body.website.trim()) {
      return NextResponse.json({ error: "Registration failed" }, { status: 400 });
    }

    // The shipped app has no CAPTCHA widget. It already sends X-Client: mobile.
    // Keep Turnstile on the website; skip it for that native client so sign-up can finish.
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
    const otp = generateSignupOtp();
    const otpHash = hashSignupOtp(otp);
    const otpExpires = signupOtpExpiresAt();

    const { data: reg, error: regErr } = await supabaseAdmin
      .from("registrations")
      .insert({
        id: randomUUID(),
        company_id: companyId,
        data: {
          email,
          name: name ?? null,
          companyName: companyDoc?.name ?? null,
          companyId,
          status: "EMAIL_UNVERIFIED",
          pendingStatus,
          role: regRole,
          emailVerified: false,
          emailOtpHash: otpHash,
          emailOtpExpiresAt: otpExpires,
          emailOtpAttempts: 0,
          companyPhone: typeof body.companyPhone === "string" ? body.companyPhone : null,
          companyAddress: typeof body.companyAddress === "string" ? body.companyAddress : null,
        },
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

    let authUser: { id: string } | null = null;
    try {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        // Require email OTP before Auth treats the address as confirmed.
        email_confirm: false,
        user_metadata: { name: name ?? undefined },
        ...(password ? { password } : {}),
      });
      if (!error && created?.user) authUser = { id: created.user.id };
      else if (error?.message?.includes("already been registered")) {
        const { data: u } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
        if (u) authUser = { id: u.id };
      }
    } catch (e) {
      console.error("Failed to create Supabase Auth user", e);
    }

    if (authUser) {
      await supabaseAdmin.from("users").upsert(
        {
          id: authUser.id,
          email,
          display_name: name ?? "",
          company_id: companyId,
          role: isFirstAdmin ? "admin" : "operative",
          approved: false,
        },
        { onConflict: "id" }
      );
      await supabaseAdmin
        .from("registrations")
        .update({
          data: {
            email,
            name: name ?? null,
            companyName: companyDoc?.name ?? null,
            companyId,
            status: "EMAIL_UNVERIFIED",
            pendingStatus,
            role: regRole,
            emailVerified: false,
            emailOtpHash: otpHash,
            emailOtpExpiresAt: otpExpires,
            emailOtpAttempts: 0,
            authUserId: authUser.id,
            companyPhone: typeof body.companyPhone === "string" ? body.companyPhone : null,
            companyAddress: typeof body.companyAddress === "string" ? body.companyAddress : null,
          },
        })
        .eq("id", reg.id);
    }

    const sent = await sendSignupVerificationEmail(email, otp);
    if (!sent.ok) {
      return NextResponse.json(
        {
          error: sent.error || "Could not send verification email",
          registrationId: reg.id,
          needsEmailVerification: true,
        },
        { status: 502 }
      );
    }

    const sentAt = new Date().toISOString();
    const { data: freshRow, error: freshErr } = await supabaseAdmin
      .from("registrations")
      .select("data")
      .eq("id", reg.id)
      .maybeSingle();
    const fresh = (freshRow?.data ?? {}) as Record<string, unknown>;
    if (!freshErr && fresh.status === "EMAIL_UNVERIFIED") {
      const { error: stampErr } = await supabaseAdmin
        .from("registrations")
        .update({ data: { ...fresh, emailOtpLastSentAt: sentAt } })
        .eq("id", reg.id)
        .filter("data->>status", "eq", "EMAIL_UNVERIFIED");
      if (stampErr) console.error("register stamp emailOtpLastSentAt failed", stampErr);
    }

    // Do NOT notify admins until email is verified (see verify-email route).
    const res = NextResponse.json(
      {
        id: reg.id,
        companyId,
        inviteCode: companyDoc?.invite_code,
        needsEmailVerification: true,
        message: "Check your email for a 6-digit verification code.",
      },
      { status: 201 }
    );
    res.cookies.set("companyId", String(companyId), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
