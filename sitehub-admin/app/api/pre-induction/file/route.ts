import { NextResponse } from "next/server";
import { createSignedUrl } from "@/supabase/storage/storageClient";
import { authorizeActingOnUser } from "@/lib/auth/actingOnUser";
import { hasTraversalSegment } from "../_utils/storagePath";

const BUCKET = "pre-induction";

/** Extract storage path from a Supabase pre-induction storage URL. Returns null if invalid. */
function extractPathFromUrl(url: string): { path: string; userId: string } | null {
  try {
    const decoded = decodeURIComponent(url.trim());
    const u = new URL(decoded);
    const pathname = u.pathname;
    // Support: /storage/v1/object/public|sign/[bucket]/[path] and /storage/v1/object/authenticated/[bucket]/[path]
    const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/);
    const extractedPath = match ? decodeURIComponent(match[1]) : null;

    // Fallback: look for "pre-induction/" in the path if the regex fails (e.g. custom CDN or proxied URL)
    let path = extractedPath;
    if (!path) {
      const idx = pathname.indexOf('pre-induction/');
      if (idx !== -1) {
        path = decodeURIComponent(pathname.slice(idx + 'pre-induction/'.length));
      }
    }
    if (!path) return null;

    const firstSlash = path.indexOf("/");
    const userId = firstSlash > 0 ? path.slice(0, firstSlash) : path;
    if (!userId || userId.length < 5) return null;
    return { path, userId };
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fileUrl = url.searchParams.get("url")?.trim();
    const rawPath = url.searchParams.get("path")?.trim();

    let path: string;
    let userId: string;

    if (rawPath && rawPath.includes("/") && rawPath.length > 10) {
      // Mobile app sends path directly (e.g. userId/rightToWork/file.pdf)
      path = rawPath;
      const firstSlash = rawPath.indexOf("/");
      userId = firstSlash > 0 ? rawPath.slice(0, firstSlash) : rawPath;
    } else if (fileUrl) {
      const extracted = extractPathFromUrl(fileUrl);
      if (!extracted) {
        return NextResponse.json({ error: "Invalid pre-induction file URL" }, { status: 400 });
      }
      path = extracted.path;
      userId = extracted.userId;
    } else {
      return NextResponse.json({ error: "Missing url or path parameter" }, { status: 400 });
    }

    if (!path.startsWith(userId + "/") || hasTraversalSegment(path)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const access = await authorizeActingOnUser(req, userId);
    if (!access.ok) return access.response;
    if (access.targetUserId !== userId) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const signedUrl = await createSignedUrl(BUCKET, path, 3600);
    // Return JSON for API clients (e.g. Flutter app) so they can open the signed URL in browser; redirect for web links
    const returnJson = url.searchParams.get("client") === "app" || req.headers.get("accept")?.includes("application/json");
    if (returnJson) {
      return NextResponse.json({ url: signedUrl });
    }
    return NextResponse.redirect(signedUrl);
  } catch (err) {
    console.error("Pre-induction file route error:", err);
    return NextResponse.json({ error: "Failed to get file" }, { status: 500 });
  }
}
