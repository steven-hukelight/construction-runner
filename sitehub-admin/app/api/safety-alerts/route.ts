import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const url = new URL(req.url);
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId) {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role: cookieStore.get("role")?.value,
        })) || undefined;
    }
    if (role === "superuser") companyId = url.searchParams.get("companyId") || companyId || undefined;

    let query = supabaseAdmin.from("safety_alerts").select("*").order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    const { data } = await query;
    return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
  } catch (e) {
    console.error("GET /api/safety-alerts:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const cookieStore = await cookies();
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role: cookieStore.get("role")?.value,
      })) || undefined;
  }
  if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { title, description, severity } = body;
  const { data, error } = await supabaseAdmin.from("safety_alerts").insert({
    title: title || "Alert",
    description: description || "",
    severity: severity || "info",
    company_id: companyId,
    site_id: body.siteId || null,
    expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
  }).select("id").single();

  if (error) {
    console.error("POST /api/safety-alerts failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}
