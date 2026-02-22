import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildComplianceDataset } from "@/app/dashboard/induction-compliance/utils/buildComplianceDataset";
import { buildPdfDocument } from "@/app/dashboard/induction-compliance/utils/buildPdfDocument";

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
    const pdfBuffer = buildPdfDocument(dataset);

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
