/**
 * POST /api/auth/setup-password
 * Sets a password only after a one-time recovery token_hash (from the welcome
 * or reset email) is verified. Email + password alone is rejected.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkLoginRateLimit } from "@/lib/rateLimit";
import { isPasswordValid, PASSWORD_REQUIREMENTS_MESSAGE } from "@/lib/passwordPolicy";

export async function POST(req: Request) {
  const { success, retryAfter } = await checkLoginRateLimit(req);
  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
      }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tokenHash = String(body.token_hash ?? body.tokenHash ?? "").trim();
    const password = String(body.password ?? "");

    if (!tokenHash) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 400 });
    }
    if (!isPasswordValid(password)) {
      return NextResponse.json({ error: PASSWORD_REQUIREMENTS_MESSAGE }, { status: 400 });
    }

    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const supabaseAuth = createClient(url, anonKey);
    const { data, error: verifyErr } = await supabaseAuth.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    const userId = data?.user?.id;
    if (verifyErr || !userId) {
      return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    });

    if (updateError) {
      console.error("setup-password updateUserById failed", updateError);
      return NextResponse.json({ error: "Could not set password. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("setup-password failed", err);
    return NextResponse.json({ error: "Could not set password. Please try again." }, { status: 500 });
  }
}
