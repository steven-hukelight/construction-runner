import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildSupervisorComplianceDataset } from "@/app/dashboard/supervisor-dashboard/utils/buildSupervisorComplianceDataset";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const siteId = url.searchParams.get("siteId");
    if (!siteId) {
      return NextResponse.json({ error: "siteId required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    let companyId = cookieStore.get("companyId")?.value;
    if (!companyId && role !== "superuser") {
      companyId =
        (await import("@/lib/auth/companyId").then((m) =>
          m.resolveCompanyId({
            cookieCompanyId: cookieStore.get("companyId")?.value,
            userEmail: cookieStore.get("user_email")?.value,
            role,
          })
        )) || undefined;
    }

    const data = await buildSupervisorComplianceDataset(siteId, { role, companyId });
    if (!data) {
      return NextResponse.json({ error: "Access denied or site not found" }, { status: 404 });
    }

    const serialized = {
      site: data.site,
      operatives: data.operatives.map((o) => ({
        ...o,
        completedAt: o.completedAt?.toISOString() ?? null,
      })),
      summary: data.summary,
      companyOptions: data.companyOptions,
      tradeOptions: data.tradeOptions ?? [],
    };

    return NextResponse.json(serialized);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load";
    console.error("GET /api/supervisor/compliance:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
