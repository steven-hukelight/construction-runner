import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { scanBufferWithClam } from "@/lib/clamav";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

function ext(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { operativeId, title, notes, fileName, fileBase64 } = body;
    if (!operativeId || !fileName || !fileBase64)
      return NextResponse.json({ error: "missing" }, { status: 400 });

    const extension = ext(fileName);
    if (!ALLOWED_EXT.includes(extension))
      return NextResponse.json({ error: "invalid file type" }, { status: 400 });

    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > MAX_BYTES)
      return NextResponse.json({ error: "file too large" }, { status: 400 });

    try {
      const scan = await scanBufferWithClam(buffer);
      if (!scan.ok) {
        return NextResponse.json(
          { error: "virus detected", detail: scan.result },
          { status: 400 }
        );
      }
    } catch (e) {
      const required = process.env.CLAMAV_REQUIRED === "true";
      if (required) {
        console.error("clamav required but scan failed", e);
        return NextResponse.json({ error: "virus scan failed" }, { status: 500 });
      }
    }

    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `medical/${operativeId}/${safeName}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("medical")
      .upload(storagePath, buffer, {
        contentType: body.contentType || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase storage upload failed:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const fileUrl = uploadData?.path
      ? `${supabaseUrl}/storage/v1/object/public/medical/${uploadData.path}`
      : null;

    await supabaseAdmin.from("medical_records").insert({
      user_id: operativeId,
      title: title ?? null,
      notes: notes ?? null,
      file_name: fileName,
      file_url: fileUrl,
      storage_path: storagePath,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, fileUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
