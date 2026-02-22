import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB for avatars
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fileBase64, contentType, fileName } = body;

    if (!fileBase64) {
      return NextResponse.json({ error: "Missing fileBase64" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const userEmail = cookieStore.get("user_email")?.value;
    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", userEmail.trim())
      .maybeSingle();
    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userId = userRow.id;

    const effectiveType = (contentType ?? "image/jpeg").toLowerCase();
    if (!ALLOWED_TYPES.includes(effectiveType)) {
      return NextResponse.json({ error: "Invalid image type" }, { status: 400 });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    const ext = effectiveType === "image/png" ? "png" : effectiveType === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/avatar_${Date.now()}.${ext}`;
    const bucketName = "avatars";

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(path, buffer, {
        contentType: effectiveType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Avatar upload failed:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const avatarUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;

    await supabaseAdmin
      .from("users")
      .update({ avatar: avatarUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);

    return NextResponse.json({ avatarUrl, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("POST /api/operative/avatar failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
