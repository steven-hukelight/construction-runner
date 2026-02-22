import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

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
      if (companyId) {
        const { data } = await supabaseAdmin
          .from("rams")
          .select("*")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
      }
      const { data } = await supabaseAdmin.from("rams").select("*").order("created_at", { ascending: false });
      return NextResponse.json((data ?? []).map((d) => ({ id: d.id, ...d })));
    }
    if (companyId) {
      const { data: ownRams } = await supabaseAdmin
        .from("rams")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      const own = (ownRams ?? []).map((d) => ({ id: d.id, ...d }));
      const { data: mainSites } = await supabaseAdmin
        .from("sites")
        .select("id")
        .eq("company_id", companyId);
      const mainSiteIds = (mainSites ?? []).map((s) => s.id);
      if (mainSiteIds.length === 0) return NextResponse.json(own);

      const seen = new Set(own.map((r: { id: string }) => r.id));
      const rams: Record<string, unknown>[] = [...own];
      for (const siteId of mainSiteIds) {
        const { data: bySite } = await supabaseAdmin
          .from("rams")
          .select("*")
          .eq("site_id", siteId)
          .order("created_at", { ascending: false });
        for (const doc of bySite ?? []) {
          if (seen.has(doc.id)) continue;
          seen.add(doc.id);
          rams.push({ id: doc.id, ...doc });
        }
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

  const { data, error } = await supabaseAdmin.from("rams").insert({
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
  return NextResponse.json({ id: data?.id }, { status: 201 });
}
