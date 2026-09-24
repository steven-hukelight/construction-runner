import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { resolveSignedUrl } from "@/lib/storage/signedUrl";
import { createReportPdf } from "@/lib/pdf/createReportPdf";
import { resolveCompanyPdfBranding } from "@/lib/pdf/resolveCompanyPdfBranding";
import { formatPdfDateTime } from "@/lib/pdf/formatPdfDateTime";
import { PDF_THEME, ensurePdfSpace, contentBottom } from "@/lib/pdf/documentChrome";

const IMG_MAX_WIDTH = 170;
const IMG_MAX_HEIGHT = 80;

async function fetchImageAsBase64(
  url: string,
): Promise<{ dataUri: string; format: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "image/*" } });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (
      !ct.includes("image/jpeg") &&
      !ct.includes("image/png") &&
      !ct.includes("image/jpg")
    )
      return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString("base64");
    const format = ct.includes("png") ? "PNG" : "JPEG";
    const mime = format === "PNG" ? "image/png" : "image/jpeg";
    const dataUri = `data:${mime};base64,${base64}`;
    return { dataUri, format };
  } catch {
    return null;
  }
}

function getRawUrl(att: { url?: string; path?: string } | string): string {
  if (typeof att === "string") return att;
  return (att as { url?: string }).url ?? (att as { path?: string }).path ?? "";
}

async function canAccessNearMissRequest(
  req: Request,
  id: string,
): Promise<NextResponse | null> {
  const auth = await resolveMobileApiAuth(req);
  if (auth.isSuperuser) return null;

  const { data: doc } = await supabaseAdmin
    .from("near_miss_reports")
    .select("*")
    .eq("id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!auth.companyId || (doc.company_id ?? null) !== auth.companyId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const forbid = await canAccessNearMissRequest(req, id);
  if (forbid) return forbid;

  const { data: item, error } = await supabaseAdmin
    .from("near_miss_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reportedById =
    (item as { reported_by?: string }).reported_by ??
    (item as { operative_id?: string }).operative_id;
  let reporterName = "—";
  if (reportedById) {
    const { data: u } = await supabaseAdmin
      .from("users")
      .select("display_name, email")
      .eq("id", reportedById)
      .maybeSingle();
    let name = u?.display_name?.trim() ?? u?.email ?? null;
    if (!name) {
      const { data: p } = await supabaseAdmin
        .from("pre_induction_personal")
        .select("full_name, data")
        .eq("user_id", reportedById)
        .maybeSingle();
      const d = (p?.data ?? {}) as Record<string, unknown>;
      name =
        ((p?.full_name ?? d?.fullName ?? d?.full_name) as string | null) ??
        null;
    }
    reporterName = name ?? reportedById;
  }

  let siteName = item.site_id ?? "—";
  if (item.site_id) {
    const { data: s } = await supabaseAdmin
      .from("sites")
      .select("name")
      .eq("id", item.site_id)
      .maybeSingle();
    if (s?.name) siteName = s.name;
  }
  const attachments = Array.isArray(item.attachments) ? item.attachments : [];

  const companyId = (item as { company_id?: string | null }).company_id ?? null;
  const branding = await resolveCompanyPdfBranding(companyId);

  const report = createReportPdf({
    title: "Near miss report",
    subtitle:
      typeof siteName === "string" ? `Site: ${siteName}` : undefined,
    branding,
    footerLabel: "Construction Runner — near miss report",
  });

  report.section("Report details");
  report.field("Reported by", reporterName);
  report.field(
    "Site",
    typeof siteName === "string" ? siteName : String(siteName),
  );
  report.field("Date", formatPdfDateTime(item.created_at));
  report.field("Status", item.reviewed_at ? "Reviewed" : "Pending");

  report.section("Description");
  report.paragraph((item.description || "—").toString(), 10);

  if (attachments.length > 0) {
    report.section("Attachments");
    const { doc, margin } = report;

    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i] as
        | { url?: string; path?: string; name?: string }
        | string;
      const raw = getRawUrl(att);
      if (!raw || (!raw.startsWith("http") && !raw.includes("/"))) continue;

      const signedUrl = await resolveSignedUrl(raw);
      if (!signedUrl) {
        report.paragraph(
          `• ${typeof att === "object" && att?.name ? att.name : raw.split("/").pop() ?? "attachment"} (unable to load)`,
          9,
        );
        continue;
      }

      const img = await fetchImageAsBase64(signedUrl);
      if (img) {
        let y = report.y;
        y = ensurePdfSpace(doc, y, IMG_MAX_HEIGHT + 8);
        if (y + IMG_MAX_HEIGHT > contentBottom(doc)) {
          doc.addPage();
          y = PDF_THEME.margin + 4;
        }
        try {
          doc.addImage(
            img.dataUri,
            img.format,
            margin,
            y,
            IMG_MAX_WIDTH,
            IMG_MAX_HEIGHT,
          );
          report.setY(y + IMG_MAX_HEIGHT + 6);
        } catch {
          report.paragraph(`• Attachment ${i + 1} (invalid image)`, 9);
        }
      } else {
        const label =
          typeof att === "object" && att?.name
            ? att.name
            : (raw.split("/").pop() ?? "attachment");
        report.paragraph(`• ${label} (not an image)`, 9);
      }
    }
  }

  const buf = report.toUint8Array();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="near-miss-report-${id}.pdf"`,
    },
  });
}
