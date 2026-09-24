import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveCompanyPdfBranding } from "@/lib/pdf/resolveCompanyPdfBranding";

export const dynamic = "force-dynamic";

/**
 * GET /api/pdf/branding — company name + logo (base64) for client-side PDF exports.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim() || "";

    if (!companyId || role === "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || companyId;
    }

    if (!companyId) {
      return NextResponse.json({ companyName: null, logo: null });
    }

    const branding = await resolveCompanyPdfBranding(companyId);
    return NextResponse.json({
      companyName: branding.companyName ?? null,
      logo: branding.logo
        ? { base64: branding.logo.base64, format: branding.logo.format }
        : null,
    });
  } catch (e) {
    console.error("GET /api/pdf/branding:", e);
    return NextResponse.json({ companyName: null, logo: null });
  }
}
