import { NextResponse } from "next/server";
import { uploadFile } from "@/supabase/storage/storageClient";
import { writeAuditLog } from "@/lib/auditLog";
import { authorizeActingOnUser } from "@/lib/auth/actingOnUser";
import { isSafePathSegment } from "../_utils/storagePath";

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
    const { sectionId, fieldName, fileName, fileBase64 } = body;
    if (!body.userId || !sectionId || !fileName || !fileBase64) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!isSafePathSegment(String(sectionId)) || (fieldName != null && !isSafePathSegment(String(fieldName)))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const access = await authorizeActingOnUser(req, String(body.userId));
    if (!access.ok) return access.response;
    const userId = access.targetUserId;
    const { uid, userEmail: authEmail } = access.actor;

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
    await writeAuditLog({
      userId,
      action: "document_upload",
      timestamp: new Date(),
      actorId: uid,
      actorEmail: authEmail ?? null,
      metadata: { sectionId, fieldName, fileName, path },
    });

    return NextResponse.json({ ok: true, path, fileUrl: path });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Pre-induction upload error:", msg);
    return NextResponse.json({ error: msg || "Upload failed" }, { status: 500 });
  }
}
