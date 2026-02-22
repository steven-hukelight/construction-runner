import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { jsPDF } from "jspdf";

async function canAccessNearMiss(id: string): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  if ((role ?? "").toLowerCase() === "superuser") return null;

  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId) {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const { data: doc } = await supabaseAdmin.from("near_miss").select("*").eq("id", id).single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!companyId || (doc.company_id ?? null) !== companyId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const forbid = await canAccessNearMiss(id);
  if (forbid) return forbid;

  const { data: item, error } = await supabaseAdmin
    .from("near_miss")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let operativeName = "—";
  if (item.operative_id) {
    const { data: u } = await supabaseAdmin
      .from("users")
      .select("display_name, email")
      .eq("id", item.operative_id)
      .maybeSingle();
    operativeName = u?.display_name ?? u?.email ?? item.operative_id;
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
  doc.text(`ID: ${id}`, 20, 34);

  let y = 44;
  doc.setFont("helvetica", "bold");
  doc.text("Operative:", 20, y);
  doc.setFont("helvetica", "normal");
  doc.text(operativeName, 60, y);
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
    y += 6;
    doc.setFont("helvetica", "normal");
    attachments.forEach((att: { url?: string; name?: string }) => {
      doc.text((att.name ?? att.url ?? "—").slice(0, 80), 20, y);
      y += 6;
    });
  }

  const buf = Buffer.from(doc.output("arraybuffer"));
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="near-miss-report-${id}.pdf"`,
    },
  });
}
