import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const templateId = body.templateCompanyId?.trim();
    const newName = body.newName?.trim();
    if (!templateId || !newName) return NextResponse.json({ error: "templateCompanyId and newName required" }, { status: 400 });

    const { data: template } = await supabaseAdmin.from("companies").select("*").eq("id", templateId).maybeSingle();
    if (!template) return NextResponse.json({ error: "Template company not found" }, { status: 404 });

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const { data: newCompany, error: companyErr } = await supabaseAdmin
      .from("companies")
      .insert({ name: newName, invite_code: inviteCode })
      .select("id")
      .single();
    if (companyErr || !newCompany) return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
    const newCompanyId = newCompany.id;

    const { data: sites } = await supabaseAdmin.from("sites").select("*").eq("company_id", templateId);
    let sitesCopied = 0;
    for (const site of sites ?? []) {
      const rest = { ...(site as Record<string, unknown>) };
      delete rest.company_id;
      delete rest.id;
      delete rest.created_at;
      delete rest.updated_at;
      await supabaseAdmin.from("sites").insert({
        ...rest,
        company_id: newCompanyId,
        name: (site.name ?? "Site") as string,
      });
      sitesCopied++;
    }

    return NextResponse.json({
      success: true,
      message: `Created company "${newName}" with ${sitesCopied} sites.`,
      companyId: newCompanyId,
      inviteCode,
      sitesCopied,
    });
  } catch (e) {
    console.error("copy-company failed:", e);
    return NextResponse.json({ error: "Copy failed" }, { status: 500 });
  }
}
