import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildSubcontractorComplianceDataset } from "@/app/dashboard/subcontractor/utils/buildSubcontractorComplianceDataset";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const companyId = cookieStore.get("companyId")?.value;

    if (role !== "sub_admin" || !companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await buildSubcontractorComplianceDataset(companyId);
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/subcontractor/compliance:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
