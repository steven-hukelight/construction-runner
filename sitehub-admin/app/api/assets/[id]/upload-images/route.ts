import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { assertInspectionAssetAccess } from "@/app/api/assets/_utils/inspectionAccess";

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

    const auth = await resolveMobileApiAuth(req);
    const access = await assertInspectionAssetAccess(auth, assetId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const userId = access.userId;

    const bucket = "assets";
    const urls: string[] = [];
    const failures: string[] = [];
    const nonEmptyFiles = files.filter((f) => f instanceof File && f.size > 0);

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
        failures.push(uploadError.message);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: insertError } = await supabaseAdmin.from("asset_documents").insert({
        asset_id: assetId,
        file_url: publicUrl,
        uploaded_by: userId,
      });

      if (insertError) {
        console.error("asset_documents insert error:", insertError);
        failures.push(insertError.message);
        continue;
      }

      urls.push(publicUrl);
    }

    if (nonEmptyFiles.length > 0 && urls.length === 0) {
      return NextResponse.json(
        {
          error: "Upload failed",
          hint: "Ensure the Supabase storage bucket named \"assets\" exists (see migration 20260322120000_assets_storage_bucket.sql).",
          details: failures,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ urls }, { status: 201 });
  } catch (e) {
    console.error("POST /api/assets/[id]/upload-images failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
