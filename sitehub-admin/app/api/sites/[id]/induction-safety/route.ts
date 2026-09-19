import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canEditSiteSafetyPack } from "@/lib/auth/roles";
import { getRestrictedSiteIds } from "@/lib/auth/siteScope";
import { normalizeSafetySections } from "@/lib/induction/safetyPack";
import {
  getSiteSafetyPack,
  resetSiteSafetyPack,
  saveSiteSafetyPack,
} from "@/lib/induction/safetyPackStore";

export const dynamic = "force-dynamic";

async function companyForSite(siteId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("sites").select("company_id").eq("id", siteId).maybeSingle();
  return data?.company_id ? String(data.company_id) : null;
}

async function assertCanEditSite(auth: { role: string | null; uid: string | null; companyId: string | null }, siteId: string) {
  if (!canEditSiteSafetyPack(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const restricted = await getRestrictedSiteIds(auth.role, auth.uid);
  if (restricted && !restricted.includes(siteId)) {
    return NextResponse.json({ error: "You can only edit safety information for your assigned sites." }, { status: 403 });
  }
  if ((auth.role ?? "").toLowerCase() === "superuser") return null;
  const siteCompany = await companyForSite(siteId);
  if (auth.companyId && siteCompany && auth.companyId !== siteCompany) {
    const { data: sub } = await supabaseAdmin
      .from("site_subcontractors")
      .select("company_id")
      .eq("site_id", siteId)
      .eq("company_id", auth.companyId)
      .maybeSingle();
    if (!sub) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (!auth.uid && !auth.userEmail) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { id: siteId } = await params;
    const url = new URL(req.url);
    const ensure = url.searchParams.get("ensure") === "1";
    const siteCompany = await companyForSite(siteId);
    const pack = await getSiteSafetyPack(siteId, {
      companyId: siteCompany ?? auth.companyId,
      ensureCopy: ensure,
      updatedBy: auth.uid,
    });
    return NextResponse.json(pack);
  } catch (e) {
    console.error("GET site induction-safety:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const { id: siteId } = await params;
    const forbid = await assertCanEditSite(auth, siteId);
    if (forbid) return forbid;
    const body = await req.json().catch(() => ({}));
    const siteCompany = (await companyForSite(siteId)) ?? auth.companyId;
    if (!siteCompany) return NextResponse.json({ error: "Company required" }, { status: 400 });
    if (body.reset === true) {
      const sections = await resetSiteSafetyPack(siteId, siteCompany, auth.uid);
      return NextResponse.json({ sections, source: "site" });
    }
    const sections = normalizeSafetySections(body.sections);
    if (!sections.length) {
      return NextResponse.json({ error: "Add at least one section with a title." }, { status: 400 });
    }
    const saved = await saveSiteSafetyPack(siteId, siteCompany, sections, auth.uid);
    return NextResponse.json({ sections: saved, source: "site" });
  } catch (e) {
    console.error("PUT site induction-safety:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
