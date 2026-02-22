import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function allowAccess(companyId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const userCompanyId = cookieStore.get("companyId")?.value;
  if (role === "superuser") return null;
  if (userCompanyId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/** GET: List operatives (users) for a company. */
export async function GET(_req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const forbid = await allowAccess(companyId);
  if (forbid) return forbid;

  const { data } = await supabaseAdmin
    .from("users")
    .select("id, display_name, email, phone")
    .eq("company_id", companyId);
  const list = (data ?? []).map((u) => ({ ...u, name: u.display_name ?? u.email }));
  return NextResponse.json(list);
}

/** POST: Create operative (user) for company. */
export async function POST(req: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const forbid = await allowAccess(companyId);
  if (forbid) return forbid;

  const body = await req.json().catch(() => ({}));
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data: inserted, error } = await supabaseAdmin
    .from("users")
    .insert({
      display_name: name,
      phone: body.phone?.trim() ?? null,
      company_id: companyId,
      role: "operative",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: inserted?.id }, { status: 201 });
}
