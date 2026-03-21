import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSignedUrl } from "@/supabase/storage/storageClient";
import { resolvePreInductionAuth } from "../_utils/mobileAuth";

const BUCKET = "pre-induction";
const ADMIN_ROLES = ["admin", "ADMIN", "supervisor", "SUPERVISOR", "superuser", "SUPERUSER"];

/** Can current user view pre-induction files for target userId? Own docs: yes. Others: admin/supervisor/superuser + same company only. */
async function canViewPreInductionFiles(
  req: Request,
  targetUserId: string,
  uidFromQuery?: string | null,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const auth = await resolvePreInductionAuth({ req, uidFromQuery });
  const { uid, role, companyId, userEmail } = auth;

  if (!role && !userEmail && !uid) {
    return { ok: false, error: "Unauthorized", status: 401 };
  }

  if (role === "superuser") return { ok: true };

  if (uid && uid === targetUserId) return { ok: true };
  if (userEmail) {
    const { data: me } = await supabaseAdmin.from("users").select("id").eq("email", userEmail.trim()).maybeSingle();
    if (me?.id === targetUserId) return { ok: true };
  }

  const roleLower = (role ?? "").toLowerCase();
  if (!ADMIN_ROLES.includes(roleLower)) {
    return { ok: false, error: "Only admins and supervisors can view other users' documents", status: 403 };
  }

  const { data: target } = await supabaseAdmin.from("users").select("company_id").eq("id", targetUserId).maybeSingle();
  if (!target) return { ok: false, error: "User not found", status: 404 };
  const targetCompanyId = (target.company_id ?? "") as string;
  if (companyId && companyId === targetCompanyId) return { ok: true };

  return { ok: false, error: "Forbidden", status: 403 };
}

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

    if (!path.startsWith(userId + "/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const uidQuery = url.searchParams.get("uid");
    const access = await canViewPreInductionFiles(req, userId, uidQuery);
    if (!access.ok) {
      return NextResponse.json({ error: access.error ?? "Forbidden" }, { status: access.status ?? 403 });
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
