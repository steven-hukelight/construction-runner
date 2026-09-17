import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { sendPushToUsers } from "@/lib/onesignal";
import { getRestrictedSiteIds, siteIdsForFilter, assertWritableSiteId } from "@/lib/auth/siteScope";
import { userIdsForSiteContent } from "@/lib/auth/siteAudience";

function toTime(a: unknown): number {
  if (!a) return 0;
  if (a instanceof Date) return a.getTime();
  if (typeof (a as { toDate?: () => Date }).toDate === "function") return (a as { toDate: () => Date }).toDate().getTime();
  return new Date(a as string).getTime();
}

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
    if (role === "superuser") {
      companyId = searchParams.get("companyId") || companyId || undefined;
      const restricted = await getRestrictedSiteIds(role);
      const siteScope = siteIdsForFilter(restricted, searchParams.get("siteId"));
      if (siteScope === "none") return NextResponse.json([]);
      if (companyId) {
        let q = supabaseAdmin
          .from("rams")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false })
          .limit(500);
        if (siteScope !== "all") q = q.in("site_id", siteScope);
        const { data, error } = await q;
        if (error) {
          console.error("GET /api/rams (superuser scoped):", error.message);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
      }
      const { data, error } = await supabaseAdmin
        .from("rams")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) {
        console.error("GET /api/rams (superuser all):", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
    }
    if (companyId) {
      const restricted = await getRestrictedSiteIds(role);
      const siteScope = siteIdsForFilter(restricted, searchParams.get("siteId"));
      if (siteScope === "none") return NextResponse.json([]);
      let ownQuery = supabaseAdmin
        .from("rams")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (siteScope !== "all") ownQuery = ownQuery.in("site_id", siteScope);
      const { data: ownRams, error: ownErr } = await ownQuery;
      if (ownErr) {
        console.error("GET /api/rams (own company):", ownErr.message);
        return NextResponse.json({ error: ownErr.message }, { status: 500 });
      }
      const own = (ownRams ?? []).map((d) => ({ id: d.id, ...d }));
      const { data: mainSites } = await supabaseAdmin
        .from("sites")
        .select("id")
        .eq("company_id", companyId);
      const mainSiteIds = (mainSites ?? []).map((s) => s.id).filter((id) =>
        siteScope === "all" ? true : siteScope.includes(id)
      );
      if (mainSiteIds.length === 0) return NextResponse.json(own);

      const seen = new Set(own.map((r: { id: string }) => r.id));
      const { data: bySite, error: siteErr } = await supabaseAdmin
        .from("rams")
        .select("*")
        .in("site_id", mainSiteIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (siteErr) {
        console.error("GET /api/rams (by site):", siteErr.message);
        return NextResponse.json({ error: siteErr.message }, { status: 500 });
      }
      const rams: Record<string, unknown>[] = [...own];
      for (const doc of bySite ?? []) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        rams.push({ id: doc.id, ...doc });
      }
      rams.sort((a, b) => toTime(b.created_at ?? b.createdAt) - toTime(a.created_at ?? a.createdAt));
      return NextResponse.json(rams);
    }
    return NextResponse.json([], { status: 200 });
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("GET /api/rams failed:", err?.message || e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
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
  const assignedCompanyId = role === "superuser" ? (body.companyId ?? companyId ?? null) : (companyId ?? null);
  if (!assignedCompanyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });
  const siteForbid = await assertWritableSiteId(role, body.siteId ?? body.site_id);
  if (siteForbid) return siteForbid;

  const { data, error } = await supabaseAdmin.from("rams").insert({
    id: randomUUID(),
    title: body.title,
    site_id: body.siteId ?? null,
    status: "PENDING",
    url: body.fileUrl ?? body.fileurl ?? null,
    company_id: assignedCompanyId,
  }).select("id").single();

  if (error) {
    console.error("POST /api/rams failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ramsSiteId = String(body.siteId ?? body.site_id ?? "").trim();
  const pushIds = await userIdsForSiteContent(assignedCompanyId, ramsSiteId);
  if (pushIds.length > 0) {
    const t = (body.title as string)?.trim() || "New RAMS";
    sendPushToUsers(pushIds, `New RAMS: ${t}`, "A new RAMS document was added", {
      type: "rams",
      screen: "rams",
    }).catch((e) => console.error("RAMS push failed:", e));
  }

  return NextResponse.json({ id: data?.id }, { status: 201 });
}
