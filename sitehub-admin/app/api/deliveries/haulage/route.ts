import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export const dynamic = "force-dynamic";

/** GET /api/deliveries/haulage - List haulage/wholesalers for company. Used by web and mobile. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
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
    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const { data } = await supabaseAdmin
      .from("company_haulage")
      .select("id, name, created_at")
      .eq("company_id", companyId)
      .order("name", { ascending: true });

    const list = (data ?? []).map((r) => ({ id: r.id, name: r.name }));
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/deliveries/haulage failed:", e);
    return NextResponse.json({ error: "Failed to fetch haulage" }, { status: 500 });
  }
}

/** POST /api/deliveries/haulage - Add haulage/wholesaler. Admin/supervisor only. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? "").toString().trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

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
    if (role === "superuser") companyId = body.companyId ?? body.company_id ?? companyId ?? undefined;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    if (role !== "superuser" && role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("company_haulage")
      .insert({ company_id: companyId, name })
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "23505") return NextResponse.json({ error: "Already exists" }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e) {
    console.error("POST /api/deliveries/haulage failed:", e);
    return NextResponse.json({ error: "Failed to add haulage" }, { status: 500 });
  }
}
