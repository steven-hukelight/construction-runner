import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("id, name, type, status, description, site_id, company_id, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (companyId && data.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/assets/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data, error } = await supabaseAdmin
      .from("assets")
      .select("id, company_id")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (companyId && data.company_id !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error: delError } = await supabaseAdmin.from("assets").delete().eq("id", id);
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/assets/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const body = await req.json().catch(() => ({}));
    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.type !== undefined) updates.type = body.type;
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.site_id !== undefined) updates.site_id = body.site_id;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates" }, { status: 400 });
    }

    let query = supabaseAdmin.from("assets").update(updates).eq("id", id);
    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { error } = await query.select("id").single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/assets/[id]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
