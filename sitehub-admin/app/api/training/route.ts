import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

/** Path must be users/{userId}/training/{id}. Caller must be superuser or user's company_id matches cookie. */
async function ensureTrainingPathAccess(targetPath: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  if (role === "superuser") return null;
  const match = targetPath.match(/^users\/([^/]+)\//);
  if (!match) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  const userId = match[1];
  const { data: userRow } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
  if (!userRow) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if ((userRow.company_id ?? "") !== (companyId ?? "")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    const url = new URL(req.url);
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam))) : 200;

    let query = supabaseAdmin
      .from("profile_training")
      .select("id, profile_id, title, issuer, issue_date, expiry_date, attachment_url, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (role !== "superuser" && companyId) {
      const userIdsRes = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
      const userIds = (userIdsRes.data ?? []).map((u) => u.id);
      if (userIds.length === 0) return NextResponse.json([]);
      const profilesRes = await supabaseAdmin.from("profiles").select("id").in("user_id", userIds);
      const profileIds = (profilesRes.data ?? []).map((p) => p.id);
      if (profileIds.length === 0) return NextResponse.json([]);
      query = query.in("profile_id", profileIds);
    } else if (role !== "superuser") {
      return NextResponse.json([]);
    }

    const { data: profileRows } = await query;

    const profileIds = [...new Set((profileRows ?? []).map((r) => r.profile_id).filter(Boolean))];
    const { data: profiles } = profileIds.length
      ? await supabaseAdmin.from("profiles").select("id, user_id").in("id", profileIds)
      : { data: [] };
    const profileByKey = new Map((profiles ?? []).map((p) => [p.id, p.user_id]));

    const userIds = [...new Set((profiles ?? []).map((p) => p.user_id).filter(Boolean))];
    const { data: users } = userIds.length ? await supabaseAdmin.from("users").select("id, company_id").in("id", userIds) : { data: [] };
    const userByKey = new Map((users ?? []).map((u) => [u.id, u.company_id]));

    const items: Array<Record<string, unknown>> = (profileRows ?? []).map((p) => {
      const uid = profileByKey.get(p.profile_id) ?? null;
      const cid = uid ? userByKey.get(uid) ?? null : null;
      return {
        id: p.id,
        parentCollection: "profiles",
        parentId: p.profile_id,
        userId: uid,
        path: `profiles/${p.profile_id}/training/${p.id}`,
        title: p.title,
        issuer: p.issuer,
        issueDate: p.issue_date,
        expiryDate: p.expiry_date,
        attachmentUrl: p.attachment_url,
        company_id: cid,
        createdAt: p.created_at,
      };
    });

    items.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const ta = typeof a.createdAt === "string" ? new Date(a.createdAt).getTime() : 0;
      const tb = typeof b.createdAt === "string" ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
    return NextResponse.json(items);
  } catch (e: unknown) {
    const err = e as Error;
    console.error("GET /api/training failed:", err?.message || e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    let targetPath = String(body.path || "").trim();
    const parentCollection = String(body.parentCollection || "").trim();
    const parentId = String(body.parentId || "").trim();
    const id = String(body.id || "").trim();
    if (!targetPath && parentCollection && parentId && id) {
      targetPath = `${parentCollection}/${parentId}/training/${id}`;
    }
    if (!targetPath) {
      return NextResponse.json({ error: "Missing path or identifiers" }, { status: 400 });
    }
    const forbid = await ensureTrainingPathAccess(targetPath);
    if (forbid) return forbid;

    const m = targetPath.match(/^profiles\/([^/]+)\/training\/([^/]+)$/);
    if (m) {
      await supabaseAdmin.from("profile_training").delete().eq("id", m[2]).eq("profile_id", m[1]);
    } else {
      return NextResponse.json({ error: "Invalid path for delete" }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("DELETE /api/training failed:", err?.message || e);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    let targetPath = String(body.path || "").trim();
    const parentCollection = String(body.parentCollection || "").trim();
    const parentId = String(body.parentId || "").trim();
    const id = String(body.id || "").trim();
    if (!targetPath && parentCollection && parentId && id) {
      targetPath = `${parentCollection}/${parentId}/training/${id}`;
    }
    if (!targetPath) {
      return NextResponse.json({ error: "Missing path or identifiers" }, { status: 400 });
    }
    const forbid = await ensureTrainingPathAccess(targetPath);
    if (forbid) return forbid;

    const m = targetPath.match(/^profiles\/([^/]+)\/training\/([^/]+)$/);
    if (!m) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) update.title = body.title || null;
    if (body.issuer !== undefined) update.issuer = body.issuer || null;
    if (body.issueDate !== undefined) update.issue_date = body.issueDate ? parseDate(body.issueDate)?.toISOString().slice(0, 10) : null;
    if (body.expiryDate !== undefined) update.expiry_date = body.expiryDate ? parseDate(body.expiryDate)?.toISOString().slice(0, 10) : null;
    if (body.attachmentUrl !== undefined) update.attachment_url = String(body.attachmentUrl || "").trim() || null;

    await supabaseAdmin.from("profile_training").update(update).eq("id", m[2]).eq("profile_id", m[1]);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as Error;
    console.error("PATCH /api/training failed:", err?.message || e);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

function parseDate(input: unknown): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  const s = String(input).trim();
  const uk = s.match(/^([0-3]?\d)[\/\-]([01]?\d)[\/\-](\d{4})$/);
  if (uk) return new Date(parseInt(uk[3], 10), parseInt(uk[2], 10) - 1, parseInt(uk[1], 10));
  const iso = s.match(/^(\d{4})[\-\/]([01]?\d)[\-\/]([0-3]?\d)$/);
  if (iso) return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
