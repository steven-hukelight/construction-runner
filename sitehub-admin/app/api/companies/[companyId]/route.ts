import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireSuperuser(): Promise<NextResponse | null> {
  const role = (await cookies()).get("role")?.value;
  if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let cookieCompanyId = cookieStore.get("companyId")?.value;
  if (!cookieCompanyId && role !== "superuser") {
    cookieCompanyId =
      (await import("@/lib/auth/companyId").then((m) =>
        m.resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })
      )) || undefined;
  }
  const { companyId } = await params;
  if (role !== "superuser" && (!cookieCompanyId || cookieCompanyId !== companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { data, error } = await supabaseAdmin.from("companies").select("*").eq("id", companyId).maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const row = data as Record<string, unknown>;
    const logoUrl = (row.logo_url ?? row.logoUrl) as string | null | undefined;
    return NextResponse.json({
      id: data.id,
      ...data,
      logoUrl: logoUrl ?? null,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let cookieCompanyId = cookieStore.get("companyId")?.value;
  if (!cookieCompanyId && role !== "superuser") {
    cookieCompanyId =
      (await import("@/lib/auth/companyId").then((m) =>
        m.resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })
      )) || undefined;
  }
  const { companyId } = await params;
  const isSuperuser = role === "superuser";
  const isOwnCompany = cookieCompanyId === companyId;

  if (!isSuperuser && !isOwnCompany) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  const { data: currentRow, error: curErr } = await supabaseAdmin
    .from("companies")
    .select("name, address")
    .eq("id", companyId)
    .maybeSingle();
  if (curErr || !currentRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const cur = currentRow as { name?: string | null; address?: string | null };

  if (body.name !== undefined) {
    const n = String(body.name).trim();
    if (!n) return NextResponse.json({ error: "Company name cannot be empty" }, { status: 400 });
    updates.name = n;
  }

  if (body.address !== undefined) {
    const a = String(body.address).trim();
    if (!a) return NextResponse.json({ error: "Company address is required" }, { status: 400 });
    updates.address = a;
  }

  const mergedName =
    body.name !== undefined ? String(body.name).trim() : String(cur.name ?? "").trim();
  const mergedAddress =
    body.address !== undefined ? String(body.address).trim() : String(cur.address ?? "").trim();

  if (body.name !== undefined || body.address !== undefined) {
    if (!mergedName) return NextResponse.json({ error: "Company name cannot be empty" }, { status: 400 });
    if (!mergedAddress) {
      return NextResponse.json(
        { error: "Company address is required. Enter the full registered or principal address." },
        { status: 400 }
      );
    }
  }

  if (Object.keys(updates).length <= 1) return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });

  try {
    const { error } = await supabaseAdmin.from("companies").update(updates).eq("id", companyId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("PATCH /api/companies/[companyId] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const auth = await requireSuperuser();
  if (auth) return auth;

  const { companyId } = await params;
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "true";

  try {
    const [{ count: userCount }, { count: siteCount }] = await Promise.all([
      supabaseAdmin.from("users").select("id", { count: "exact", head: true }).eq("company_id", companyId),
      supabaseAdmin.from("sites").select("id", { count: "exact", head: true }).eq("company_id", companyId),
    ]);

    if (!force && ((userCount ?? 0) > 0 || (siteCount ?? 0) > 0)) {
      return NextResponse.json(
        { error: "Company has users or sites. Move or remove them first, or use ?force=true to delete anyway." },
        { status: 400 }
      );
    }
    await supabaseAdmin.from("companies").delete().eq("id", companyId);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("DELETE /api/companies/[companyId] failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
