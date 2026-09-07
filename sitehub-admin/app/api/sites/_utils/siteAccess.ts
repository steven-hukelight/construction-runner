import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function cid(x: { company_id?: string | null; main_contractor_id?: string | null }): string | null {
  return (x.main_contractor_id ?? x.company_id ?? null) as string | null;
}

/** Same rules as PATCH/GET on /api/sites/[id]: main contractor, owning company, subcontractor link, or superuser. */
export async function ensureSiteAccess(siteId: string): Promise<NextResponse | null> {
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
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const mainId = cid(site);
  if (mainId === companyId) return null;

  const { data: sub } = await supabaseAdmin
    .from("site_subcontractors")
    .select("company_id")
    .eq("site_id", siteId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (sub) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
