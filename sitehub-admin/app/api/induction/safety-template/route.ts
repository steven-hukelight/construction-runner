import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canEditCompanySafetyPack } from "@/lib/auth/roles";
import { normalizeSafetySections } from "@/lib/induction/safetyPack";
import { getCompanySafetyTemplate, saveCompanySafetyTemplate } from "@/lib/induction/safetyPackStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.uid && !auth.userEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const companyId = auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const pack = await getCompanySafetyTemplate(companyId);
    return NextResponse.json({
      sections: pack.sections,
      exists: pack.exists,
      updatedAt: pack.updatedAt,
    });
  } catch (e) {
    console.error("GET /api/induction/safety-template:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!canEditCompanySafetyPack(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const companyId = auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const sections = normalizeSafetySections(body.sections);
    if (!sections.length) {
      return NextResponse.json({ error: "Add at least one section with a title." }, { status: 400 });
    }
    const saved = await saveCompanySafetyTemplate(companyId, sections, auth.uid);
    return NextResponse.json({ sections: saved });
  } catch (e) {
    console.error("PUT /api/induction/safety-template:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
