import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Redeem subcontractor invite code. Creates partner company, sub_admin user, links to site. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code ?? "").trim().toUpperCase();
    const email = String(body.email ?? "").trim();
    const name = String(body.name ?? "").trim() || email.split("@")[0];
    if (!code || !email) return NextResponse.json({ error: "code and email required" }, { status: 400 });

    const { data: invite } = await supabaseAdmin.from("invite_codes").select("*").eq("id", code).maybeSingle();
    if (!invite) return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
    if ((invite.type as string) !== "subcontractor") return NextResponse.json({ error: "Invalid invite code type" }, { status: 400 });

    const siteId = invite.site_id as string;

    const partnerName = body.companyName?.trim() || `${name}'s company`;
    const { data: newCompany, error: companyErr } = await supabaseAdmin
      .from("companies")
      .insert({ name: partnerName })
      .select("id")
      .single();
    if (companyErr || !newCompany) return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    const newCompanyId = newCompany.id;

    let authUser: { id: string } | null = null;
    const { data: existing } = await supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) {
      authUser = { id: existing.id };
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) return NextResponse.json({ error: "Could not create account" }, { status: 500 });
      authUser = created?.user ? { id: created.user.id } : null;
    }

    if (!authUser) return NextResponse.json({ error: "Could not create account" }, { status: 500 });

    await supabaseAdmin.from("users").upsert(
      {
        id: authUser.id,
        email,
        display_name: name || email.split("@")[0],
        company_id: newCompanyId,
        role: "admin",
      },
      { onConflict: "id" }
    );

    await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
      app_metadata: { companyId: newCompanyId, role: "sub_admin", approved: true },
    });

    await supabaseAdmin.from("site_subcontractors").upsert(
      { site_id: siteId, company_id: newCompanyId },
      { onConflict: "site_id,company_id" }
    );

    return NextResponse.json({
      company_id: newCompanyId,
      companyId: newCompanyId,
      site_id: siteId,
      siteId,
      userId: authUser.id,
      redirect: "/subcontractor/setup",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/invite-codes/redeem failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
