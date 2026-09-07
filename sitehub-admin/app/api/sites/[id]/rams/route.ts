import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

async function ensureSiteAccess(siteId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  if (role === "superuser") return null;
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const mainId = cid(site);
  const { data: sub } = await supabaseAdmin.from("site_subcontractors").select("company_id").eq("site_id", siteId).eq("company_id", companyId).maybeSingle();
  if (mainId === companyId || sub) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = await params;
  const forbid = await ensureSiteAccess(siteId);
  if (forbid) return forbid;

  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const companyId = cookieStore.get("companyId")?.value;
  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
  const mainId = site ? cid(site) : null;
  const isMain = mainId === companyId || role === "superuser";

  let data;
  if (isMain) {
    const res = await supabaseAdmin
      .from("rams")
      .select("*")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });
    data = res.data;
  } else {
    const res = await supabaseAdmin
      .from("rams")
      .select("*")
      .eq("site_id", siteId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    data = res.data;
  }
  const rams = (data ?? []).map((d) => ({ id: d.id, ...d }));
  return NextResponse.json(rams);
}
