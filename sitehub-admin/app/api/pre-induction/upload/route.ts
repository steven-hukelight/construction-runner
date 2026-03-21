import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { uploadFile } from "@/supabase/storage/storageClient";
import { writeAuditLog } from "@/lib/auditLog";
import { resolvePreInductionAuth } from "../_utils/mobileAuth";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXT = [".pdf", ".png", ".jpg", ".jpeg"];

const EXT_TO_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function ext(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

function contentTypeForUpload(contentType: string | undefined, extension: string): string {
  const allowed = EXT_TO_MIME[extension];
  if (allowed) return allowed;
  const raw = contentType?.trim().toLowerCase();
  if (raw && raw !== "application/octet-stream" && ["application/pdf", "image/png", "image/jpeg", "image/jpg"].includes(raw)) {
    return raw === "image/jpg" ? "image/jpeg" : raw;
  }
  return "application/pdf";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, sectionId, fieldName, fileName, fileBase64 } = body;
    if (!userId || !sectionId || !fileName || !fileBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const auth = await resolvePreInductionAuth({ req, uidFromBody: body.uid });
    const { uid, role, companyId, userEmail: authEmail } = auth;

    if (!role && !companyId && !uid) {
      return NextResponse.json({ error: "Unauthorized. Please sign in again." }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin.from("users").select("company_id").eq("id", userId).single();
    if (!userRow) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userCompanyId = userRow.company_id as string | undefined;
    const isOwnUpload = uid && uid === userId;
    if (!isOwnUpload && role !== "superuser" && companyId !== userCompanyId) {
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
    // Use extension-derived MIME type; bucket allows application/pdf, image/png, image/jpeg only
    const mimeType = contentTypeForUpload(body.contentType, extension);
    const fileBlob = new Blob([buffer], { type: mimeType });
    await uploadFile(bucketName, path, fileBlob);
    // Return storage path for DB - mobile uses createPreInductionSignedUrl(path) when viewing (bucket is private)
    const cookieStore = await cookies();
    const email = authEmail ?? cookieStore.get("user_email")?.value;
    const { data: meRows } = email
      ? await supabaseAdmin.from("users").select("id").eq("email", email).limit(1)
      : { data: [] };
    const actorId = uid ?? meRows?.[0]?.id ?? "unknown";
    await writeAuditLog({
      userId,
      action: "document_upload",
      timestamp: new Date(),
      actorId,
      actorEmail: authEmail ?? cookieStore.get("user_email")?.value ?? null,
      metadata: { sectionId, fieldName, fileName, path },
    });

    return NextResponse.json({ ok: true, path, fileUrl: path });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Pre-induction upload error:", msg);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 500 });
  }
}
