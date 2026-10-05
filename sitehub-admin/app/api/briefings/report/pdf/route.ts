import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { fetchCompanyLogoForPdf } from "@/lib/pdf/fetchCompanyLogoForPdf";
import { buildAcknowledgementsReportPdf } from "@/lib/pdf/buildAcknowledgementsReportPdf";
import { loadAcknowledgementPeople } from "@/lib/acknowledgementPeople";

export const dynamic = "force-dynamic";

/** GET /api/briefings/report/pdf — PDF acknowledgement report with company logo. */
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

    const briefingId = searchParams.get("briefingId")?.trim();
    if (!briefingId) {
      return NextResponse.json({ error: "briefingId required" }, { status: 400 });
    }

    const { data: briefing, error: bErr } = await supabaseAdmin
      .from("briefings")
      .select("id, title, company_id, site_id, created_at")
      .eq("id", briefingId)
      .maybeSingle();

    if (bErr || !briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }
    if ((briefing.company_id ?? null) !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const acksPromise = supabaseAdmin
      .from("briefing_acknowledgements")
      .select("user_id, acknowledged_at, signature_url")
      .eq("briefing_id", briefingId)
      .order("acknowledged_at", { ascending: false });
    const peoplePromise = acksPromise.then(({ data }) =>
      loadAcknowledgementPeople((data ?? []).map((a) => a.user_id))
    );
    const sitePromise = briefing.site_id
      ? supabaseAdmin.from("sites").select("name").eq("id", briefing.site_id).maybeSingle()
      : Promise.resolve({ data: null });
    const companyPromise = supabaseAdmin
      .from("companies")
      .select("name, logo_url")
      .eq("id", companyId)
      .maybeSingle();
    const logoPromise = companyPromise.then(({ data }) =>
      fetchCompanyLogoForPdf((data as { logo_url?: string | null } | null)?.logo_url ?? null)
    );

    const [{ data: acks }, people, { data: site }, { data: companyRow }, logo] = await Promise.all([
      acksPromise,
      peoplePromise,
      sitePromise,
      companyPromise,
      logoPromise,
    ]);
    const siteName = site?.name ? String(site.name) : null;

    const rows = (acks ?? []).map((a) => {
      const p = people.get(a.user_id);
      return {
        name: p?.name ?? "—",
        role: p?.role ?? "—",
        acknowledgedAt: a.acknowledged_at,
        hasSignature: Boolean(a.signature_url),
      };
    });

    const pdfBuffer = buildAcknowledgementsReportPdf({
      documentLabel: "Briefing acknowledgements",
      documentTitle: (briefing.title ?? "Untitled").toString(),
      companyName: companyRow?.name ? String(companyRow.name) : null,
      siteLine: siteName ? `Site: ${siteName}` : briefing.site_id ? `Site ID: ${briefing.site_id}` : null,
      createdAt: briefing.created_at,
      rows,
      logo,
    });

    const slug = `briefing-acknowledgements-${briefingId.slice(0, 8)}`;
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${slug}-${new Date().toISOString().slice(0, 10)}.pdf"`,
      },
    });
  } catch (e) {
    console.error("GET /api/briefings/report/pdf:", e);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
