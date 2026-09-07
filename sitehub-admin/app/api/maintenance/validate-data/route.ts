import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Returns document counts per company and flags docs missing company_id. Superuser only. */
export async function GET() {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: companies } = await supabaseAdmin.from("companies").select("id, name");
    const companyList = (companies ?? []).map((c) => ({ id: c.id, name: c.name }));

    const tables = ["sites", "users", "tasks", "rams", "deliveries"] as const;
    const perCompany: Record<string, Record<string, number>> = {};
    const missingCompanyId: Record<string, number> = {};

    for (const table of tables) {
      const { data } = await supabaseAdmin.from(table).select("company_id");
      const rows = data ?? [];
      let missing = 0;
      const byCompany: Record<string, number> = {};
      for (const row of rows) {
        const cid = (row as { company_id?: string }).company_id;
        if (cid === undefined || cid === null || cid === "") missing++;
        else byCompany[cid] = (byCompany[cid] || 0) + 1;
      }
      missingCompanyId[table] = missing;
      for (const c of companyList) {
        if (!perCompany[c.id]) perCompany[c.id] = {};
        perCompany[c.id][table] = byCompany[c.id] || 0;
      }
    }

    const { data: att } = await supabaseAdmin.from("attendance").select("user_id");
    const userIds = (att ?? []).map((a) => (a as { user_id?: string }).user_id).filter(Boolean);
    const { data: users } = userIds.length ? await supabaseAdmin.from("users").select("id, company_id").in("id", userIds) : { data: [] };
    const attByCompany: Record<string, number> = {};
    for (const u of users ?? []) {
      const cid = (u as { company_id?: string }).company_id ?? "";
      if (cid) attByCompany[cid] = (attByCompany[cid] || 0) + 1;
    }
    missingCompanyId["attendance"] = (att ?? []).length - (users ?? []).length;
    for (const c of companyList) {
      if (!perCompany[c.id]) perCompany[c.id] = {};
      perCompany[c.id]["attendance"] = attByCompany[c.id] || 0;
    }

    return NextResponse.json({
      companies: companyList,
      perCompany,
      missingCompanyId,
      message: Object.values(missingCompanyId).some((n) => n > 0)
        ? "Some documents have no company_id."
        : "All documents have company_id set.",
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/maintenance/validate-data failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
