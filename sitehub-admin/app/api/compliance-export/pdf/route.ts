import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildComplianceDataset } from "@/app/dashboard/induction-compliance/utils/buildComplianceDataset";
import { buildPdfDocument } from "@/app/dashboard/induction-compliance/utils/buildPdfDocument";
import { fetchCompanyLogoForPdf, type LogoForPdf } from "@/lib/pdf/fetchCompanyLogoForPdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;

    if (!companyId && role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const filters = {
      status: url.searchParams.get("status") || undefined,
      companyId: url.searchParams.get("companyId") || undefined,
      trade: url.searchParams.get("trade") || undefined,
      siteId: url.searchParams.get("siteId") || undefined,
      role: url.searchParams.get("role") || undefined,
      expiry: url.searchParams.get("expiry") || undefined,
    };

    const dataset = await buildComplianceDataset({ role, companyId }, filters);
    const logoCompanyId = filters.companyId || companyId || null;
    let logo: LogoForPdf | null = null;
    if (logoCompanyId) {
      const { data: co } = await supabaseAdmin
        .from("companies")
        .select("logo_url")
        .eq("id", logoCompanyId)
        .maybeSingle();
      const logoUrl = (co as { logo_url?: string | null } | null)?.logo_url ?? null;
      logo = await fetchCompanyLogoForPdf(logoUrl);
    }
    const pdfBuffer = buildPdfDocument(dataset, { logo });

    const filename = `compliance_report_${new Date().toISOString().slice(0, 10)}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed";
    console.error("GET /api/compliance-export/pdf:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
