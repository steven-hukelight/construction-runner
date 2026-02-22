import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAccess(companyId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const userEmail = cookieStore.get("user_email")?.value;
  let effectiveCompanyId = cookieStore.get("companyId")?.value?.trim();

  if (!effectiveCompanyId && role !== "superuser") {
    effectiveCompanyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
      })) || undefined;
  }

  const roleLower = (role ?? "").toLowerCase();
  if (roleLower === "operative") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (role !== "superuser" && effectiveCompanyId !== companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const err = await ensureAccess(companyId);
    if (err) return err;

    const { data } = await supabaseAdmin
      .from("assets")
      .select("id, name, description, type, status, site_id, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    const items = (data ?? []).map((a) => ({
      id: (a as Record<string, unknown>).id,
      name: (a as Record<string, unknown>).name ?? "",
      description: (a as Record<string, unknown>).description ?? null,
      status: (a as Record<string, unknown>).status ?? "active",
      type: (a as Record<string, unknown>).type ?? "equipment",
    }));
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/companies/[companyId]/assets failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  try {
    const { companyId } = await params;
    const err = await ensureAccess(companyId);
    if (err) return err;

    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const description = body?.description != null ? String(body.description).trim() : null;
    const type = body?.type != null ? String(body.type) : "equipment";
    const status = body?.status != null ? String(body.status) : "active";

    const { data, error } = await supabaseAdmin
      .from("assets")
      .insert({ company_id: companyId, name, description, type, status })
      .select("id")
      .single();

    if (error) {
      console.error("POST assets failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/companies/[companyId]/assets failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
