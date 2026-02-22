import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getComplianceDrawerData } from "@/app/dashboard/induction-compliance/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const siteIdsParam = url.searchParams.get("siteIds");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
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

    const siteIds = siteIdsParam ? siteIdsParam.split(",").filter(Boolean) : undefined;
    const data = await getComplianceDrawerData(userId, { role, companyId }, { siteIds });
    if (!data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("GET induction-compliance drawer:", e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
