/**
 * My Info — admin/supervisor view of a worker.
 *
 * GET  /api/admin/users/[id]/info  -> read one worker's my-info (medical, emergency contact,
 *                                     competency card, declarations).
 * PUT  /api/admin/users/[id]/info  -> admin edits a worker's my-info on the worker's behalf.
 *
 * Auth: admin, supervisor, or superuser role. Same-company constraint enforced by
 * checkPreInductionAccess. Every write from an admin actor is audit-logged with
 * action=my_info_edited_on_behalf.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { checkPreInductionAccess } from "@/app/api/pre-induction/[userId]/_utils/auth";
import { readMyInfo, writeMyInfo, type WriteMyInfoPatch } from "@/lib/myInfo";
import { resolvePreInductionAuth } from "@/app/api/pre-induction/_utils/mobileAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await checkPreInductionAccess(id, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }
    const payload = await readMyInfo(id);
    return NextResponse.json(payload);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/admin/users/:id/info] GET failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const access = await checkPreInductionAccess(id, req);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status ?? 403 });
    }

    const body = (await req.json()) as WriteMyInfoPatch;

    // Identify the acting admin for the audit log.
    const auth = await resolvePreInductionAuth({ req });
    let actorUserId = auth.uid;
    if (!actorUserId && auth.userEmail) {
      const { data } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("email", auth.userEmail.trim())
        .maybeSingle();
      if (data?.id) actorUserId = String(data.id);
    }
    const cookieStore = await cookies();

    const result = await writeMyInfo(id, body, {
      editingOnBehalf: actorUserId != null && actorUserId !== id,
      actorUserId: actorUserId ?? null,
      actorEmail: auth.userEmail ?? cookieStore.get("user_email")?.value ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("[api/admin/users/:id/info] PUT failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
