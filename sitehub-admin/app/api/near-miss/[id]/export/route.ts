import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { resolveSignedUrl } from "@/lib/storage/signedUrl";
import { jsPDF } from "jspdf";

const IMG_MAX_WIDTH = 170;
const IMG_MAX_HEIGHT = 80;

async function fetchImageAsBase64(url: string): Promise<{ dataUri: string; format: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url, { headers: { Accept: "image/*" } });
    if (!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("image/jpeg") && !ct.includes("image/png") && !ct.includes("image/jpg"))
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

  const { data: doc } = await supabaseAdmin.from("near_miss_reports").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!auth.companyId || (doc.company_id ?? null) !== auth.companyId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const forbid = await canAccessNearMissRequest(req, id);
  if (forbid) return forbid;

  const { data: item, error } = await supabaseAdmin
    .from("near_miss_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reportedById = (item as { reported_by?: string }).reported_by ?? (item as { operative_id?: string }).operative_id;
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
      name = (p?.full_name ?? d?.fullName ?? d?.full_name) as string | null ?? null;
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

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Near Miss Report", 20, 20);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 28);

  let y = 40;
  doc.setFont("helvetica", "bold");
  doc.text("Reported by:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(reporterName, 60, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Site:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(typeof siteName === "string" ? siteName : String(siteName), 60, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Date:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(
    item.created_at ? new Date(item.created_at).toLocaleString("en-GB") : "—",
    60,
    y
  );
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Status:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(item.reviewed_at ? "Reviewed" : "Pending", 60, y);
  y += 12;

  doc.setFont("helvetica", "bold");
  doc.text("Description:", 20, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  const desc = (item.description || "—").toString();
  const splitDesc = doc.splitTextToSize(desc, 170);
  doc.text(splitDesc, 20, y);
  y += splitDesc.length * 6 + 8;

  if (attachments.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Attachments:", 20, y);
    y += 8;

    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i] as { url?: string; path?: string; name?: string } | string;
      const raw = getRawUrl(att);
      if (!raw || (!raw.startsWith("http") && !raw.includes("/"))) continue;

      const signedUrl = await resolveSignedUrl(raw);
      if (!signedUrl) {
        doc.setFont("helvetica", "normal");
        const label = typeof att === "object" && att?.name ? att.name : raw.split("/").pop() ?? "attachment";
        doc.text(`• ${label} (unable to load)`, 20, y);
        y += 6;
        continue;
      }

      const img = await fetchImageAsBase64(signedUrl);
      if (img) {
        if (y + IMG_MAX_HEIGHT > 280) {
          doc.addPage();
          y = 20;
        }
        try {
          doc.addImage(img.dataUri, img.format, 20, y, IMG_MAX_WIDTH, IMG_MAX_HEIGHT);
          y += IMG_MAX_HEIGHT + 6;
        } catch {
          doc.setFont("helvetica", "normal");
          doc.text(`• Attachment ${i + 1} (invalid image)`, 20, y);
          y += 6;
        }
      } else {
        doc.setFont("helvetica", "normal");
        const label = typeof att === "object" && att?.name ? att.name : raw.split("/").pop() ?? "attachment";
        doc.text(`• ${label} (not an image)`, 20, y);
        y += 6;
      }
    }
  }

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="near-miss-report-${id}.pdf"`,
    },
  });
}
