import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { normalizeRole } from "@/lib/auth/roles";
import { getRestrictedSiteIds } from "@/lib/auth/siteScope";
import { listInductedSitesForUser } from "@/lib/induction/listInductedSites";

export const dynamic = "force-dynamic";

function canLookupOtherUserInductions(role: string | null | undefined): boolean {
  const r = normalizeRole(role);
  return (
    r === "superuser" ||
    r === "admin" ||
    r === "site_admin" ||
    r === "supervisor" ||
    r === "sub_admin"
  );
}

/** Admin/supervisor: sites this operative may be signed into (valid induction). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    if (!canLookupOtherUserInductions(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const userId = String(id ?? "").trim();
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const { data: target } = await supabaseAdmin
      .from("users")
      .select("id, company_id")
      .eq("id", userId)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetCompany = String(
      (target as { company_id?: string | null }).company_id ?? "",
    ).trim();
    const cookieCompany = cookieStore.get("companyId")?.value?.trim() ?? "";
    const roleLower = normalizeRole(role);
    if (roleLower !== "superuser" && cookieCompany && targetCompany && cookieCompany !== targetCompany) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const restricted = await getRestrictedSiteIds(role);
    const sites = await listInductedSitesForUser(userId, {
      companyId: targetCompany || cookieCompany || null,
      restrictToSiteIds: restricted,
    });
    return NextResponse.json(sites);
  } catch (e) {
    console.error("GET /api/users/[id]/inducted-sites failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
