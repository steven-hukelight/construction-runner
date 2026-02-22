import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

async function ensureMainContractor(siteId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  if (role === "superuser") return null;
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).maybeSingle();
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cid(site) !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const forbid = await ensureMainContractor(siteId);
  if (forbid) return forbid;

  const { data: subs } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id, created_at")
    .eq("site_id", siteId);

  const companyIds = [...new Set((subs ?? []).map((s) => s.company_id))];
  const { data: companies } = companyIds.length
    ? await supabaseAdmin.from("companies").select("id, name").in("id", companyIds)
    : { data: [] };
  const nameByKey = new Map((companies ?? []).map((c) => [c.id, c.name]));

  const list = (subs ?? []).map((s) => ({
    companyId: s.company_id,
    linkedAt: s.created_at,
    companyName: nameByKey.get(s.company_id) ?? null,
  }));
  return NextResponse.json(list);
}
