import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const uid = (await cookies()).get("uid")?.value?.trim();
    const userEmail = (await cookies()).get("user_email")?.value;
    if (!uid && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `near_miss/${Date.now()}-${safeName}`;
    const bucket = "asset_photos";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (error) {
      const fallbackBucket = "assets";
      const { error: e2 } = await supabaseAdmin.storage.from(fallbackBucket).upload(path, buffer, { contentType: file.type, upsert: true });
      if (e2) {
        console.error("near-miss upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }
      const { data: d } = supabaseAdmin.storage.from(fallbackBucket).getPublicUrl(path);
      return NextResponse.json({ url: d.publicUrl });
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (e) {
    console.error("POST /api/near-miss/upload failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
