import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function ensureUserCanAccess(userId: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const { data: user } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).maybeSingle();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const userCompanyId = (user as { company_id?: string }).company_id;
  if (role === "superuser") return null;
  const userEmail = cookieStore.get("user_email")?.value;
  const { data: me } = userEmail
    ? await supabaseAdmin.from("users").select("id").eq("email", userEmail.trim()).maybeSingle()
    : { data: null };
  if (me && (me as { id?: string }).id === userId) return null;
  if (companyId && companyId === userCompanyId) return null;
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File;
    const userId = form.get("userId") as string;
    if (!file || !userId) {
      return NextResponse.json({ error: "file and userId required" }, { status: 400 });
    }

    const forbid = await ensureUserCanAccess(userId);
    if (forbid) return forbid;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const path = `certifications/${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const bucket = "uploads";

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true });

    if (uploadError) {
      console.error("Certification upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed. Ensure 'uploads' bucket exists." }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
    return NextResponse.json({ fileUrl: urlData.publicUrl, fileName: file.name }, { status: 201 });
  } catch (e) {
    console.error("POST /api/certifications/upload failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
