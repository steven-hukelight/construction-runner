import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  deliverPasswordResetEmail,
  generateRecoveryLink,
  setupPasswordPageUrl,
} from "@/lib/sendPasswordReset";
import { getServerPublicOrigin } from "@/lib/url";
import { checkRateLimit, rateLimitClientId } from "@/lib/rateLimit";
import {
  REDEEM_FAILURE_MIN_MS,
  REDEEM_GENERIC_FAILURE,
  REDEEM_RATE_LIMITS,
  SUBCONTRACTOR_INVITE_TYPE as INVITE_TYPE,
} from "@/lib/inviteCodes";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tooManyAttempts(retryAfter?: number) {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    { status: 429, headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined }
  );
}

async function genericFailure(startedAt: number) {
  const wait = REDEEM_FAILURE_MIN_MS - (Date.now() - startedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return NextResponse.json(REDEEM_GENERIC_FAILURE, { status: 400 });
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Fails closed: a lookup error counts as "registered" so the existing account is never touched. */
async function emailIsRegistered(email: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from("users").select("id").ilike("email", escapeLike(email)).limit(1);
  if (error) return true;
  return Array.isArray(data) && data.length > 0;
}

async function releaseClaim(code: string) {
  await supabaseAdmin.rpc("release_invite_code", { p_code: code }).then(
    () => undefined,
    () => undefined
  );
}

/**
 * Redeem a subcontractor invite code: creates a new auth account, a partner company and a
 * sub_admin user, then links the company to the code's site. Existing accounts are never modified.
 */
export async function POST(req: Request) {
  const startedAt = Date.now();
  try {
    const ipLimit = await checkRateLimit(
      `invite-redeem-ip:${rateLimitClientId(req)}`,
      REDEEM_RATE_LIMITS.perIp.max,
      REDEEM_RATE_LIMITS.perIp.windowMs
    );
    if (!ipLimit.success) return tooManyAttempts(ipLimit.retryAfter);

    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    const email = String(body.email ?? "").trim();
    const name = String(body.name ?? "").trim() || email.split("@")[0];
    if (!code || !email) return NextResponse.json({ error: "code and email required" }, { status: 400 });
    if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "A valid email is required" }, { status: 400 });

    const codeKey = createHash("sha256").update(code).digest("hex").slice(0, 32);
    const codeLimit = await checkRateLimit(
      `invite-redeem-code:${codeKey}`,
      REDEEM_RATE_LIMITS.perCode.max,
      REDEEM_RATE_LIMITS.perCode.windowMs
    );
    if (!codeLimit.success) return tooManyAttempts(codeLimit.retryAfter);

    const [registered, { data: invite }] = await Promise.all([
      emailIsRegistered(email),
      supabaseAdmin.from("invite_codes").select("id, type").eq("id", code).maybeSingle(),
    ]);
    if (registered || !invite || invite.type !== INVITE_TYPE) return genericFailure(startedAt);

    const { data: claimed, error: claimErr } = await supabaseAdmin.rpc("claim_invite_code", {
      p_code: code,
      p_type: INVITE_TYPE,
    });
    const claim = Array.isArray(claimed) ? claimed[0] : claimed;
    const siteId = (claim?.claimed_site_id as string | null | undefined) ?? null;
    if (claimErr || !claim || !siteId) return genericFailure(startedAt);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name },
    });
    const authUserId = created?.user?.id;
    if (createErr || !authUserId) {
      await releaseClaim(code);
      return genericFailure(startedAt);
    }

    const rollback = async () => {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
      await releaseClaim(code);
    };

    const partnerName = body.companyName?.trim() || `${name}'s company`;
    const { data: newCompany, error: companyErr } = await supabaseAdmin
      .from("companies")
      .insert({ name: partnerName })
      .select("id")
      .single();
    if (companyErr || !newCompany) {
      await rollback();
      return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    }
    const newCompanyId = newCompany.id;

    const { error: userErr } = await supabaseAdmin.from("users").insert({
      id: authUserId,
      email,
      display_name: name || email.split("@")[0],
      company_id: newCompanyId,
      role: "sub_admin",
      approved: true,
    });
    if (userErr) {
      await supabaseAdmin.from("companies").delete().eq("id", newCompanyId);
      await rollback();
      return NextResponse.json({ error: "Could not create account" }, { status: 500 });
    }

    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      app_metadata: { companyId: newCompanyId, role: "sub_admin", approved: true },
    });

    await supabaseAdmin.from("site_subcontractors").upsert(
      { site_id: siteId, company_id: newCompanyId },
      { onConflict: "site_id,company_id" }
    );

    let setupEmailSent = false;
    try {
      const link = await generateRecoveryLink(email, setupPasswordPageUrl(getServerPublicOrigin()));
      setupEmailSent = await deliverPasswordResetEmail(email, link, "setup");
    } catch (mailErr) {
      console.error("POST /api/invite-codes/redeem setup email failed:", mailErr);
    }

    return NextResponse.json({
      company_id: newCompanyId,
      companyId: newCompanyId,
      site_id: siteId,
      siteId,
      userId: authUserId,
      existingUser: false,
      setupEmailSent,
      redirect: "/setup-password",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/invite-codes/redeem failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
