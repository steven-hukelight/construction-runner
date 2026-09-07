import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { fetchCompanyLogoForPdf } from "@/lib/pdf/fetchCompanyLogoForPdf";
import { buildAcknowledgementsReportPdf } from "@/lib/pdf/buildAcknowledgementsReportPdf";

export const dynamic = "force-dynamic";

/** GET /api/rams/report/pdf?ramsId=&companyId= — per-document RAMS acknowledgement PDF with logo. */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }

    if (role !== "superuser" && role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const ramsId = searchParams.get("ramsId")?.trim();
    if (!ramsId) {
      return NextResponse.json({ error: "ramsId required" }, { status: 400 });
    }

    const { data: ram, error: rErr } = await supabaseAdmin
      .from("rams")
      .select("id, title, company_id, site_id, created_at")
      .eq("id", ramsId)
      .maybeSingle();

    if (rErr || !ram) {
      return NextResponse.json({ error: "RAMS not found" }, { status: 404 });
    }
    if ((ram.company_id ?? null) !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: acks } = await supabaseAdmin
      .from("rams_acknowledgements")
      .select("user_id, acknowledged_at, signature_url")
      .eq("rams_id", ramsId)
      .order("acknowledged_at", { ascending: false });

    const userIds = [...new Set((acks ?? []).map((a) => a.user_id).filter(Boolean))];
    const { data: users } = userIds.length
      ? await supabaseAdmin.from("users").select("id, name, display_name, email").in("id", userIds)
      : { data: [] };

    const userMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        {
          name: (u.display_name ?? u.name ?? u.email ?? "—").toString(),
          email: (u.email ?? "—").toString(),
        },
      ])
    );

    let siteName: string | null = null;
    if (ram.site_id) {
      const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", ram.site_id).maybeSingle();
      siteName = site?.name ? String(site.name) : null;
    }

    const { data: companyRow } = await supabaseAdmin
      .from("companies")
      .select("name, logo_url")
      .eq("id", companyId)
      .maybeSingle();

    const logoUrl = (companyRow as { logo_url?: string | null } | null)?.logo_url ?? null;
    const logo = await fetchCompanyLogoForPdf(logoUrl);

    const rows = (acks ?? []).map((a) => {
      const u = userMap.get(a.user_id);
      return {
        name: u?.name ?? "—",
        email: u?.email ?? "—",
        acknowledgedAt: a.acknowledged_at,
        hasSignature: Boolean(a.signature_url),
      };
    });

    const pdfBuffer = buildAcknowledgementsReportPdf({
      documentLabel: "RAMS acknowledgements",
      documentTitle: (ram.title ?? "Untitled").toString(),
      companyName: companyRow?.name ? String(companyRow.name) : null,
      siteLine: siteName ? `Site: ${siteName}` : ram.site_id ? `Site ID: ${ram.site_id}` : null,
      createdAt: ram.created_at,
      rows,
      logo,
    });

    const slug = `rams-acknowledgements-${ramsId.slice(0, 8)}`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    console.error("GET /api/rams/report/pdf:", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
