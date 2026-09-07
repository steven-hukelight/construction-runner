import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSignedUrl } from "@/supabase/storage/storageClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { extractBucketAndPath } from "@/lib/storage/signedUrl";

/** Allowed buckets for signed URL access (documents, briefings, RAMS, medical, pre-induction, etc.) */
const ALLOWED_BUCKETS = new Set([
  "briefings", "rams", "rams_documents", "uploads", "asset_documents", "asset_photos",
  "near_miss_reports", "company_documents", "assets", "medical", "pre-induction",
]);

/**
 * Ensure user is authenticated. Supports:
 * 1. Cookie-based auth (web: role, user_email, uid)
 * 2. Bearer token (mobile/Supabase session: Authorization: Bearer <jwt>)
 */
async function requireAuth(req: Request): Promise<{ ok: boolean; error?: string; status?: number }> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const userEmail = cookieStore.get("user_email")?.value;
  const uid = cookieStore.get("uid")?.value?.trim();
  if (role || userEmail || uid) {
    return { ok: true };
  }

  // Bearer token (mobile app with Supabase session)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && user) return { ok: true };
      } catch {
        // fall through to 401
      }
    }
  }

  return { ok: false, error: "Unauthorized", status: 401 };
}

/**
 * GET /api/storage/signed-url?url=<encoded_storage_url>
 * Returns a time-limited signed URL for viewing private storage objects.
 * Used when getPublicUrl links return 403 (private buckets).
 */
export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status ?? 401 });
    }

    const url = new URL(req.url);
    const fileUrl = url.searchParams.get("url")?.trim();
    if (!fileUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const extracted = extractBucketAndPath(fileUrl);
    if (!extracted) {
      return NextResponse.json({ error: "Invalid storage URL" }, { status: 400 });
    }

    const { bucket, path } = extracted;
    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json({ error: "Bucket not allowed" }, { status: 403 });
    }

    const signedUrl = await createSignedUrl(bucket, path, 3600);
    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    console.error("Signed URL route error:", err);
    return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
  }
}
