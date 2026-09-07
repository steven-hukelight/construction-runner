import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Export one company's data as JSON. Superuser only. */
export async function GET(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const companyId = new URL(req.url).searchParams.get("companyId");
    if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

    const [sitesRes, usersRes, tasksRes, ramsRes, deliveriesRes, usersForAtt] = await Promise.all([
      supabaseAdmin.from("sites").select("*").eq("company_id", companyId),
      supabaseAdmin.from("users").select("*").eq("company_id", companyId),
      supabaseAdmin.from("tasks").select("*").eq("company_id", companyId),
      supabaseAdmin.from("rams").select("*").eq("company_id", companyId),
      supabaseAdmin.from("deliveries").select("*").eq("company_id", companyId),
      supabaseAdmin.from("users").select("id").eq("company_id", companyId),
    ]);

    const userIds = (usersForAtt.data ?? []).map((u) => u.id);
    const { data: attendance } = userIds.length
      ? await supabaseAdmin.from("attendance").select("*").in("user_id", userIds)
      : { data: [] };

    const exportData = {
      companyId,
      exportedAt: new Date().toISOString(),
      sites: sitesRes.data ?? [],
      users: usersRes.data ?? [],
      tasks: tasksRes.data ?? [],
      rams: ramsRes.data ?? [],
      deliveries: deliveriesRes.data ?? [],
      attendance: attendance ?? [],
    };

    return NextResponse.json(exportData);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/maintenance/export-company failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
