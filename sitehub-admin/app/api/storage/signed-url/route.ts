import { NextResponse } from "next/server";
import { createSignedUrl } from "@/supabase/storage/storageClient";
import { extractBucketAndPath } from "@/lib/storage/signedUrl";
import { authorizeStorageRead } from "@/lib/storage/privateFile";

/**
 * GET /api/storage/signed-url?url=<encoded_storage_url>
 * Returns a time-limited signed URL for a private storage object the verified caller may read.
 * Unknown or malformed paths get 403, never a signed link.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fileUrl = url.searchParams.get("url")?.trim();
    if (!fileUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    const extracted = extractBucketAndPath(fileUrl);
    const access = extracted
      ? await authorizeStorageRead(req, extracted.bucket, extracted.path)
      : ({ ok: false, status: 403 } as const);
    if (!access.ok) {
      return NextResponse.json(
        { error: access.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: access.status }
      );
    }

    const signedUrl = await createSignedUrl(extracted!.bucket, extracted!.path, 3600);
    return NextResponse.json({ url: signedUrl });
  } catch (err) {
    console.error("Signed URL route error:", err);
    return NextResponse.json({ error: "Failed to create signed URL" }, { status: 500 });
  }
}
