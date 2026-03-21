import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deleteFile } from "@/supabase/storage/storageClient";
import { resolvePreInductionAuth } from "../_utils/mobileAuth";

const BUCKET = "pre-induction";
const ADMIN_ROLES = ["admin", "ADMIN", "supervisor", "SUPERVISOR", "superuser", "SUPERUSER"];

async function canDeletePreInductionFiles(
  req: Request,
  targetUserId: string,
  uidFromBody?: string | null,
): Promise<{ ok: boolean; error?: string; status?: number }> {
  const auth = await resolvePreInductionAuth({ req, uidFromBody });
  const { uid, role, companyId } = auth;

  if (!role && !uid) return { ok: false, error: "Unauthorized", status: 401 };
  if (uid && uid === targetUserId) return { ok: true };
  if (role === "superuser") return { ok: true };

  const roleLower = (role ?? "").toLowerCase();
  if (!ADMIN_ROLES.includes(roleLower)) {
    return { ok: false, error: "Only admins and supervisors can delete other users' documents", status: 403 };
  }
  const { data: target } = await supabaseAdmin.from("users").select("company_id").eq("id", targetUserId).maybeSingle();
  if (!target) return { ok: false, error: "User not found", status: 404 };
  if (companyId && companyId === (target.company_id ?? "")) return { ok: true };
  return { ok: false, error: "Forbidden", status: 403 };
}

function extractPathFromUrl(url: string): { path: string; userId: string } | null {
  try {
    const decoded = decodeURIComponent(url.trim());
    const u = new URL(decoded);
    const pathname = u.pathname;
    const match = pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/);
    let path = match ? decodeURIComponent(match[1]) : null;

    // Fallback: look for "pre-induction/" substring
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

/** Parse path or URL. Raw path format: userId/sectionId/file (mobile app stores paths). */
function parsePathOrUrl(value: string, userId: string): { path: string } | null {
  const t = value?.trim();
  if (!t) return null;
  // Raw storage path (mobile upload returns path, not full URL)
  if (!t.startsWith("http://") && !t.startsWith("https://")) {
    if (t.includes("/") && t.startsWith(userId + "/")) return { path: t };
    return null;
  }
  const extracted = extractPathFromUrl(t);
  return extracted && extracted.path.startsWith(userId + "/") ? { path: extracted.path } : null;
}

/** POST body: { url?: string, path?: string, userId: string, uid?: string } - deletes file from storage */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, path: pathParam, userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }
    const parsed = pathParam
      ? parsePathOrUrl(pathParam, userId)
      : url
        ? parsePathOrUrl(url, userId)
        : null;
    if (!parsed) {
      return NextResponse.json(
        { error: "Missing or invalid url/path. Use raw storage path (userId/sectionId/file) or full URL." },
        { status: 400 },
      );
    }
    const { path } = parsed;
    if (!path.startsWith(userId + "/")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }
    const access = await canDeletePreInductionFiles(req, userId, body.uid);
    if (!access.ok) {
      return NextResponse.json({ error: access.error ?? "Forbidden" }, { status: access.status ?? 403 });
    }
    await deleteFile(BUCKET, path);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Pre-induction delete-document error:", msg);
    return NextResponse.json({ error: msg ?? "Delete failed" }, { status: 500 });
  }
}
