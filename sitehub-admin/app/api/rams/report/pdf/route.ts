import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { fetchCompanyLogoForPdf } from "@/lib/pdf/fetchCompanyLogoForPdf";
import { buildAcknowledgementsReportPdf } from "@/lib/pdf/buildAcknowledgementsReportPdf";
import { loadAcknowledgementPeople } from "@/lib/acknowledgementPeople";

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

    const acksPromise = supabaseAdmin
      .from("rams_acknowledgements")
      .select("user_id, acknowledged_at, signature_url")
      .eq("rams_id", ramsId)
      .order("acknowledged_at", { ascending: false });
    const peoplePromise = acksPromise.then(({ data }) =>
      loadAcknowledgementPeople((data ?? []).map((a) => a.user_id))
    );
    const sitePromise = ram.site_id
      ? supabaseAdmin.from("sites").select("name").eq("id", ram.site_id).maybeSingle()
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
