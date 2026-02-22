import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data: asset } = await supabaseAdmin
      .from("assets")
      .select("company_id")
      .eq("id", assetId)
      .single();
    if (!asset || (companyId && (asset as { company_id?: string }).company_id !== companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data } = await supabaseAdmin
      .from("asset_documents")
      .select("id, file_url, created_at")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false });

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (e) {
    console.error("GET /api/assets/[id]/images failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
