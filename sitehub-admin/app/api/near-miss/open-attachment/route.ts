import { NextResponse } from "next/server";
import { resolveSignedUrl } from "@/lib/storage/signedUrl";
import {
  authorizeNearMissViewer,
  findNearMissAttachment,
  loadNearMissReportFor,
} from "@/lib/auth/nearMissAccess";

/**
 * GET /api/near-miss/open-attachment?url=<encoded_storage_url>&reportId=<id>
 * Redirects to a signed URL for the attachment. Use as direct link href so
 * attachments open without fetch/popup (avoids blockers).
 * Only signs a url that is one of the report's own attachments.
 */
export async function GET(req: Request) {
  try {
    const access = await authorizeNearMissViewer(req);
    if (!access.ok) return access.response;

    const url = new URL(req.url);
    const fileUrl = url.searchParams.get("url")?.trim();
    const reportId = url.searchParams.get("reportId")?.trim();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }
    if (!reportId) {
      return NextResponse.json({ error: "Missing reportId parameter" }, { status: 400 });
    }

    const report = await loadNearMissReportFor(access.viewer, reportId);
    if (!report.ok) return report.response;

    const attachment = findNearMissAttachment(report.report.attachments, fileUrl);
    if (!attachment) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const signedUrl = await resolveSignedUrl(attachment);
    if (!signedUrl) {
      return NextResponse.json({ error: "Could not resolve attachment URL" }, { status: 400 });
    }

    return NextResponse.redirect(signedUrl, 302);
  } catch (e) {
    console.error("near-miss open-attachment:", e);
    return NextResponse.json({ error: "Failed to open attachment" }, { status: 500 });
  }
}
