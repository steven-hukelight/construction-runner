import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { uploadFile, getFileUrl } from "@/supabase/storage/storageClient";
import { writeAuditLog } from "@/lib/auditLog";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

function ext(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sectionId, fieldName, fileName, fileBase64 } = body;
    if (!userId || !sectionId || !fileName || !fileBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;

    if (!role && !companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).single();
    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userCompanyId = userRow.company_id as string | undefined;
    if (role !== "superuser" && companyId !== userCompanyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const extension = ext(fileName);
    if (!ALLOWED_EXT.includes(extension)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }

    const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const path = `${userId}/${sectionId}/${fieldName}_${safeName}`;
    const bucketName = "pre-induction";
    // Convert buffer to Blob for Supabase upload
    const fileBlob = new Blob([buffer], { type: body.contentType || "application/octet-stream" });
    await uploadFile(bucketName, path, fileBlob);
    const url = await getFileUrl(bucketName, path);

    const email = cookieStore.get("user_email")?.value;
    const { data: meRows } = email
      ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1)
      : { data: [] };
    const actorId = meRows?.[0]?.id ?? "unknown";
    await writeAuditLog({
      userId,
      action: "document_upload",
      timestamp: new Date(),
      actorId,
      actorEmail: cookieStore.get("user_email")?.value ?? null,
      metadata: { sectionId, fieldName, fileName, path },
    });

    return NextResponse.json({ ok: true, fileUrl: url });
  } catch (err) {
    console.error("Pre-induction upload error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
