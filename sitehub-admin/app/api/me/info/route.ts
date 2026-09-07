/**
 * My Info — the worker's own view.
 *
 * GET  /api/me/info          -> current user's medical/emergency/competency/declarations
 * PUT  /api/me/info          -> current user updates their own info
 *
 * Auth: cookie session or Bearer token (mobile). Anyone signed in can hit this
 * endpoint for THEIR OWN user record. Cross-user reads/writes go through
 * /api/admin/users/[id]/info.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { readMyInfo, writeMyInfo, type WriteMyInfoPatch } from "@/lib/myInfo";

export const dynamic = "force-dynamic";

/** Resolve the currently-signed-in user's UUID from auth (cookies, bearer token). */
async function resolveMeUid(req: Request): Promise<string | null> {
  const auth = await resolvePreInductionAuth({ req });
  if (auth.uid) return auth.uid;

  // Fall back to looking up by email if the session cookie only carried an email.
  if (auth.userEmail) {
    const { data } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", auth.userEmail.trim())
      .maybeSingle();
    if (data?.id) return String(data.id);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const uid = await resolveMeUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const payload = await readMyInfo(uid);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/me/info] GET failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const uid = await resolveMeUid(req);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as WriteMyInfoPatch;
    const cookieStore = await cookies();
    const result = await writeMyInfo(uid, body, {
      editingOnBehalf: false,
      actorUserId: uid,
      actorEmail: cookieStore.get("user_email")?.value ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/me/info] PUT failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
