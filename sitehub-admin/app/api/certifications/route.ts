import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: Record<string, unknown>): string | undefined {
  return (x.company_id ?? x.companyId) as string | undefined;
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
    const userIdParam = url.searchParams.get("userId");
    const limit = limitParam ? Math.max(1, Math.min(500, parseInt(limitParam))) : 200;

    let query = supabaseAdmin
      .from("certifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userIdParam) {
      query = query.eq("user_id", userIdParam);
    } else if (role !== "superuser" && companyId) {
      const userIdsRes = await supabaseAdmin.from("users").select("id").eq("company_id", companyId);
      const userIds = (userIdsRes.data ?? []).map((u) => u.id);
      if (userIds.length === 0) return NextResponse.json([]);
      query = query.in("user_id", userIds);
    } else if (role !== "superuser") {
      return NextResponse.json([]);
    }

    const { data } = await query;

    const userIds = [...new Set((data ?? []).map((d) => (d as Record<string, unknown>).user_id ?? (d as Record<string, unknown>).userid).filter(Boolean))];
    const companyMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await supabaseAdmin.from("users").select("id, company_id").in("id", userIds);
      for (const u of users ?? []) {
        const c = (u as Record<string, unknown>).company_id;
        if (c) companyMap[u.id] = c as string;
      }
    }

    const items = (data ?? []).map((doc) => {
      const d = doc as Record<string, unknown>;
      const userId = d.user_id ?? d.userid;
      return {
        id: d.id,
        ...doc,
        parentCollection: "users",
        parentId: userId,
        userId,
        companyId: userId ? companyMap[userId as string] : undefined,
      };
    });

    items.sort((a, b) => {
      const ta = (a as Record<string, unknown>).created_at ? new Date((a as Record<string, unknown>).created_at as string).getTime() : 0;
      const tb = (b as Record<string, unknown>).created_at ? new Date((b as Record<string, unknown>).created_at as string).getTime() : 0;
      return tb - ta;
    });
    return NextResponse.json(items);
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("GET /api/certifications failed:", err?.message || e);
    return NextResponse.json([], { status: 200 });
  }
}

async function ensureUserCanAccessCertifications(userId: string): Promise<NextResponse | null> {
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
  const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userCompanyId = (user as { company_id?: string }).company_id;
  if (role === "superuser") return null;
  const userEmail = cookieStore.get("user_email")?.value;
  const { data: me } = userEmail
    ? await supabaseAdmin.from("users").select("id").eq("email", userEmail.trim()).maybeSingle()
    : { data: null };
  if (me && (me as { id?: string }).id === userId) return null;
  if (companyId && companyId === userCompanyId) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const targetUserId = body.userId ?? body.user_id;
    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const forbid = await ensureUserCanAccessCertifications(targetUserId);
    if (forbid) return forbid;

    const type = body.name ?? body.type ?? body.title ?? "Certification";
    const issuedAt = body.issuedDate ?? body.issued_at ?? body.issueDate;
    const expiresAt = body.expiryDate ?? body.expires_at ?? body.expiryDate;
    const attachmentUrl = body.fileUrl ?? body.attachment_url ?? body.attachmentUrl ?? null;
    const attachmentType = body.fileName
      ? body.fileName.split(".").pop() ?? null
      : body.attachment_type ?? null;

    const insertPayload: Record<string, unknown> = {
      id: body.id ?? crypto.randomUUID(),
      user_id: targetUserId,
      type: String(type).trim() || "Certification",
      issued_at: issuedAt ? new Date(issuedAt).toISOString() : null,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      attachment_url: attachmentUrl ?? null,
      attachment_type: attachmentType ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from("certifications")
      .insert(insertPayload)
      .select("id")
      .single();

    if (error) {
      console.error("POST /api/certifications failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("POST /api/certifications failed:", err?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

async function ensureCertificationPathAccess(targetPath: string): Promise<NextResponse | null> {
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
  if (role === "superuser") return null;
  const match = targetPath.match(/^users\/([^/]+)\//);
  if (!match) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  const userId = match[1];
  const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).single();
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userCompanyId = user.company_id as string | undefined;
  if (companyId !== userCompanyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    let targetPath = String(body.path || "").trim();
    const parentCollection = String(body.parentCollection || "").trim();
    const parentId = String(body.parentId || "").trim();
    const id = String(body.id || "").trim();
    if (!targetPath && parentCollection && parentId && id) {
      targetPath = `${parentCollection}/${parentId}/certifications/${id}`;
    }
    if (!targetPath) {
      return NextResponse.json({ error: "Missing path or identifiers" }, { status: 400 });
    }
    const forbid = await ensureCertificationPathAccess(targetPath);
    if (forbid) return forbid;
    const match = targetPath.match(/^users\/([^/]+)\/certifications\/([^/]+)/);
    if (match) {
      const [, userId, certId] = match;
      await supabaseAdmin.from("certifications").delete().eq("id", certId).eq("user_id", userId);
    }
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("DELETE /api/certifications failed:", err?.message || e);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

function parseDate(input: unknown): Date {
  if (!input) return new Date(NaN);
  if (input instanceof Date) return input;
  if (typeof input === "number") return new Date(input);
  const s = String(input).trim();
  const uk = s.match(/^([0-3]?\d)[\/\-]([01]?\d)[\/\-](\d{4})$/);
  if (uk) {
    return new Date(parseInt(uk[3], 10), parseInt(uk[2], 10) - 1, parseInt(uk[1], 10));
  }
  const iso = s.match(/^(\d{4})[\-\/]([01]?\d)[\-\/]([0-3]?\d)$/);
  if (iso) {
    return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
  }
  return new Date(s);
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    let targetPath = String(body.path || "").trim();
    const parentCollection = String(body.parentCollection || "").trim();
    const parentId = String(body.parentId || "").trim();
    const id = String(body.id || "").trim();
    if (!targetPath && parentCollection && parentId && id) {
      targetPath = `${parentCollection}/${parentId}/certifications/${id}`;
    }
    if (!targetPath) {
      return NextResponse.json({ error: "Missing path or identifiers" }, { status: 400 });
    }
    const forbid = await ensureCertificationPathAccess(targetPath);
    if (forbid) return forbid;

    const match = targetPath.match(/^users\/([^/]+)\/certifications\/([^/]+)/);
    if (!match) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    const [, userId, certId] = match;

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.title !== undefined) update.title = body.title || null;
    if (body.issuer !== undefined) update.issuer = body.issuer || null;
    if (body.issueDate !== undefined) {
      const d = body.issueDate ? parseDate(body.issueDate) : null;
      update.issued_at = d ? d.toISOString() : null;
    }
    if (body.expiryDate !== undefined) {
      const d = body.expiryDate ? parseDate(body.expiryDate) : null;
      update.expires_at = d ? d.toISOString() : null;
    }
    if (body.attachmentUrl !== undefined) {
      const url = String(body.attachmentUrl || "").trim();
      update.attachment_url = url || null;
    }

    await supabaseAdmin.from("certifications").update(update).eq("id", certId).eq("user_id", userId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("PATCH /api/certifications failed:", err?.message || e);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}
