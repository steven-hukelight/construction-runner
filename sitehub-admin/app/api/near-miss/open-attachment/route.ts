import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveSignedUrl } from "@/lib/storage/signedUrl";

/**
 * GET /api/near-miss/open-attachment?url=<encoded_storage_url>&reportId=<id>
 * Redirects to a signed URL for the attachment. Use as direct link href so
 * attachments open without fetch/popup (avoids blockers).
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const uid = cookieStore.get("uid")?.value?.trim();
    const userEmail = cookieStore.get("user_email")?.value;
    if (!role && !uid && !userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const fileUrl = url.searchParams.get("url")?.trim();
    const reportId = url.searchParams.get("reportId")?.trim();

    if (!fileUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    if (reportId) {
      const { data: doc } = await supabaseAdmin
        .from("near_miss_reports")
        .select("id, company_id")
        .eq("id", reportId)
        .single();
      if (!doc) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const companyId = cookieStore.get("companyId")?.value;
      const isSuperuser = (role ?? "").toLowerCase() === "superuser";
      if (!isSuperuser && companyId && doc.company_id !== companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const signedUrl = await resolveSignedUrl(fileUrl);
    if (!signedUrl) {
      return NextResponse.json({ error: "Could not resolve attachment URL" }, { status: 400 });
    }

    return NextResponse.redirect(signedUrl, 302);
  } catch (e) {
    console.error("near-miss open-attachment:", e);
    return NextResponse.json({ error: "Failed to open attachment" }, { status: 500 });
  }
}
