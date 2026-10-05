import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { SAME_COMPANY_MANAGER_ROLES } from "@/lib/auth/actingOnUser";
import { generateInviteCode, SUBCONTRACTOR_INVITE_TYPE } from "@/lib/inviteCodes";

/** Create a subcontractor invite code for a site. Superuser, or a manager role of the site's company. */
export async function POST(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    const role = (auth.role ?? "").toLowerCase();
    const isSuperuser = auth.isSuperuser || role === "superuser";
    if (!isSuperuser && !SAME_COMPANY_MANAGER_ROLES.has(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const siteId = (body.site_id ?? body.siteId)?.trim();
    if (!siteId) return NextResponse.json({ error: "site_id (or siteId) required" }, { status: 400 });

    const { data: site } = await supabaseAdmin.from("sites").select("company_id").eq("id", siteId).maybeSingle();
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });
    const siteCompanyId = site.company_id ?? null;
    if (!isSuperuser && (!auth.companyId || siteCompanyId !== auth.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let code = generateInviteCode();
    for (let i = 0; i < 10; i++) {
      const { data } = await supabaseAdmin.from("invite_codes").select("id").eq("id", code).maybeSingle();
      if (!data) break;
      code = generateInviteCode();
    }

    const { error: insertErr } = await supabaseAdmin.from("invite_codes").insert({
      id: code,
      type: SUBCONTRACTOR_INVITE_TYPE,
      main_contractor_id: siteCompanyId,
      site_id: siteId,
      role: "sub_admin",
    });
    if (insertErr) {
      console.error("invite_codes insert failed:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({ code, site_id: siteId, siteId }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/invite-codes failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
