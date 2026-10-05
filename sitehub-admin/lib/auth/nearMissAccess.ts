import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth, type MobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canRoleViewNearMiss } from "@/lib/auth/nearMissRoles";
import { extractBucketAndPath } from "@/lib/storage/signedUrl";

export type NearMissViewer = MobileApiAuth & { uid: string };

export type NearMissViewerResult =
  | { ok: true; viewer: NearMissViewer }
  | { ok: false; response: NextResponse };

export type NearMissReportResult =
  | { ok: true; viewer: NearMissViewer; report: Record<string, unknown> & { id: string; company_id: string | null } }
  | { ok: false; response: NextResponse };

const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const forbidden = () => NextResponse.json({ error: "Forbidden" }, { status: 403 });

/**
 * Verified caller who may view near-miss reports: superuser (any company), or
 * admin / supervisor with a company. Everyone else gets 403; no credentials gets 401.
 */
export async function authorizeNearMissViewer(req: Request): Promise<NearMissViewerResult> {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return { ok: false, response: auth };
  if (!auth.uid) return { ok: false, response: unauthorized() };
  const viewer = { ...auth, uid: auth.uid };
  if (auth.isSuperuser) return { ok: true, viewer };
  if (!canRoleViewNearMiss(auth.role) || !auth.companyId) return { ok: false, response: forbidden() };
  return { ok: true, viewer };
}

/**
 * Same rule for server components, which have no incoming Request: the verified
 * web session is read from cookies. Returns null when the caller is not a viewer.
 */
export async function authorizeNearMissPageViewer(): Promise<NearMissViewer | null> {
  const access = await authorizeNearMissViewer(new Request("http://localhost/dashboard"));
  return access.ok ? access.viewer : null;
}

export function canViewNearMissReport(viewer: NearMissViewer, report: { company_id?: string | null }): boolean {
  if (viewer.isSuperuser) return true;
  return !!viewer.companyId && (report.company_id ?? null) === viewer.companyId;
}

/** Loads report `id` for an already-authorized viewer: 404 when missing, 403 when it belongs to another company. */
export async function loadNearMissReportFor(viewer: NearMissViewer, id: string): Promise<NearMissReportResult> {
  const { data: report } = await supabaseAdmin.from("near_miss_reports").select("*").eq("id", id).maybeSingle();
  if (!report) return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (!canViewNearMissReport(viewer, report)) return { ok: false, response: forbidden() };
  return { ok: true, viewer, report };
}

export async function authorizeNearMissReport(req: Request, id: string): Promise<NearMissReportResult> {
  const access = await authorizeNearMissViewer(req);
  if (!access.ok) return access;
  return loadNearMissReportFor(access.viewer, id);
}

const ATTACHMENT_BUCKETS = new Set(["asset_photos", "assets"]);

function attachmentRef(att: unknown): string {
  if (typeof att === "string") return att.trim();
  if (!att || typeof att !== "object") return "";
  const a = att as { url?: unknown; path?: unknown; downloadUrl?: unknown; fileUrl?: unknown };
  const ref = [a.url, a.path, a.downloadUrl, a.fileUrl].find((v) => typeof v === "string" && v.trim());
  return typeof ref === "string" ? ref.trim() : "";
}

/** `bucket/near_miss/<file>` for a near-miss upload location (see /api/near-miss/upload), else null. */
function attachmentObjectKey(ref: string): string | null {
  const loc = extractBucketAndPath(ref);
  if (!loc || !ATTACHMENT_BUCKETS.has(loc.bucket)) return null;
  const match = loc.path.match(/^near_miss\/([^/]+)$/);
  if (!match || match[1] === "." || match[1] === "..") return null;
  return `${loc.bucket}/${loc.path}`;
}

/**
 * Returns the stored attachment reference on `attachments` that points at the same
 * near-miss upload as `requested`, or null when it is not one of the report's attachments.
 */
export function findNearMissAttachment(attachments: unknown, requested: string): string | null {
  const wanted = attachmentObjectKey(requested);
  if (!wanted || !Array.isArray(attachments)) return null;
  for (const att of attachments) {
    const ref = attachmentRef(att);
    if (ref && attachmentObjectKey(ref) === wanted) return ref;
  }
  return null;
}
