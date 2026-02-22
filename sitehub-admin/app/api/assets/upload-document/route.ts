import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const assetId = form.get("assetId") as string;
    if (!file || !assetId) {
      return NextResponse.json({ error: "file and assetId required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    if (role === "operative") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
      return NextResponse.json({ error: "Asset not found or forbidden" }, { status: 403 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const path = `assets/${assetId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const bucket = "assets";
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("asset document upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed. Ensure 'assets' storage bucket exists." }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    const fileUrl = urlData.publicUrl;

    const { data: doc, error } = await supabaseAdmin
      .from("asset_documents")
      .insert({ asset_id: assetId, file_url: fileUrl })
      .select("id")
      .single();

    if (error) {
      console.error("asset_documents insert failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: doc?.id, fileUrl }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/upload-document failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
