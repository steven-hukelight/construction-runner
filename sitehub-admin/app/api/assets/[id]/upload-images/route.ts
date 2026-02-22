import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assetId } = await params;
    const form = await req.formData();
    const files = form.getAll("files") as File[];

    if (!assetId || !files?.length) {
      return NextResponse.json({ error: "assetId and at least one file required" }, { status: 400 });
    }

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
      return NextResponse.json({ error: "Asset not found or forbidden" }, { status: 403 });
    }

    const bucket = "assets";
    const urls: string[] = [];

    for (const file of files) {
      if (!(file instanceof File) || file.size === 0) continue;
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `${assetId}/images/${Date.now()}-${safeName}`;

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        console.error("asset image upload error:", uploadError);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      urls.push(urlData.publicUrl);

      await supabaseAdmin.from("asset_documents").insert({
        asset_id: assetId,
        file_url: urlData.publicUrl,
      });
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/[id]/upload-images failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
