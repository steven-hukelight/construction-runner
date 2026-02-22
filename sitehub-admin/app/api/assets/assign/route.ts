import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

async function ensureAdminAccess(): Promise<{ companyId: string | null; error: NextResponse | null }> {
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
  const userEmail = cookieStore.get("user_email")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();

  if (role === "operative") {
    return { companyId: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail,
        role,
      })) || "";
  }
  return { companyId: companyId ?? null, error: null };
}

export async function POST(req: Request) {
  try {
    const { companyId, error } = await ensureAdminAccess();
    if (error) return error;
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const assetId = body?.asset_id ?? body?.assetId;
    const userId = body?.user_id ?? body?.userId;
    if (!assetId || !userId) {
      return NextResponse.json({ error: "asset_id and user_id required" }, { status: 400 });
    }

    const { data: asset } = await supabaseAdmin
      .from("assets")
      .select("company_id")
      .eq("id", assetId)
      .single();
    if (asset && (asset as { company_id?: string }).company_id !== companyId) {
      return NextResponse.json({ error: "Asset not in your company" }, { status: 403 });
    }

    const { data, error: insertErr } = await supabaseAdmin
      .from("asset_assignments")
      .insert({ asset_id: assetId, user_id: userId })
      .select("id")
      .single();

    if (insertErr) {
      console.error("POST /api/assets/assign failed:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/assign failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
