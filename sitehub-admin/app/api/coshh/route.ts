import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET() {
  try {
    const cookieStore = await cookies();
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
    if (role !== "superuser" && !companyId) return NextResponse.json([]);

    let query = supabaseAdmin.from("coshh").select("*").order("created_at", { ascending: false });
    if (companyId) query = query.eq("company_id", companyId);
    const { data } = await query;
    return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
  } catch (e) {
    console.error("GET /api/coshh:", e);
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

  const { title, substance, hazardSymbols, ppe, fileUrl } = body;
  const { data, error } = await supabaseAdmin.from("coshh").insert({
    title: title || "Untitled",
    substance: substance || "",
    hazard_symbols: hazardSymbols || [],
    ppe: ppe || "",
    file_url: fileUrl || null,
    company_id: companyId,
  }).select("id").single();

  if (error) {
    console.error("POST /api/coshh failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: data?.id });
}
