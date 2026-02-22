import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

function generateCode(length = 8): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
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
    const body = await req.json().catch(() => ({}));
    const siteId = (body.site_id ?? body.siteId)?.trim();
    if (!siteId) return NextResponse.json({ error: "site_id (or siteId) required" }, { status: 400 });

    const { data: site } = await supabaseAdmin.from("sites").select("company_id").eq("id", siteId).maybeSingle();
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    const siteCompanyId = site.company_id ?? null;
    const effectiveCompanyId = role === "superuser" ? (companyId ?? siteCompanyId) : companyId;
    if (!effectiveCompanyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (role !== "superuser" && siteCompanyId !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let code = generateCode();
    for (let i = 0; i < 10; i++) {
      const { data } = await supabaseAdmin.from("invite_codes").select("id").eq("id", code).maybeSingle();
      if (!data) break;
      code = generateCode();
    }

    const { error: upsertErr } = await supabaseAdmin.from("invite_codes").upsert({
      id: code,
      type: "subcontractor",
      main_contractor_id: siteCompanyId,
      site_id: siteId,
      role: "sub_admin",
    }, { onConflict: "id" });
    if (upsertErr) {
      console.error("invite_codes upsert failed:", upsertErr);
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ code, site_id: siteId, siteId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/invite-codes failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
