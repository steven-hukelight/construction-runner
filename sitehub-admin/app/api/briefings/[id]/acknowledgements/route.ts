import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { loadAcknowledgementPeople } from "@/lib/acknowledgementPeople";

export const dynamic = "force-dynamic";

function briefingCompanyId(row: { company_id?: string | null }): string | null {
  return (row.company_id ?? null) as string | null;
}

/** GET — list users who acknowledged this briefing (admin / supervisor / superuser, company-scoped). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: briefingId } = await params;
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

    if (role !== "superuser" && role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    if (role === "superuser") {
      companyId = searchParams.get("companyId") || companyId || undefined;
    }

    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const { data: briefing, error: bErr } = await supabaseAdmin
      .from("briefings")
      .select("id, title, company_id, site_id, created_at")
      .eq("id", briefingId)
      .maybeSingle();

    if (bErr || !briefing) {
      return NextResponse.json({ error: "Briefing not found" }, { status: 404 });
    }
    if (briefingCompanyId(briefing) !== companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: acks, error: aErr } = await supabaseAdmin
      .from("briefing_acknowledgements")
      .select("user_id, acknowledged_at, signature_url")
      .eq("briefing_id", briefingId)
      .order("acknowledged_at", { ascending: false });

    if (aErr) {
      console.error("briefing acknowledgements select:", aErr);
      return NextResponse.json({ error: "Failed to load acknowledgements" }, { status: 500 });
    }

    const [userMap, { data: site }] = await Promise.all([
      loadAcknowledgementPeople((acks ?? []).map((a) => a.user_id)),
      briefing.site_id
        ? supabaseAdmin.from("sites").select("name").eq("id", briefing.site_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const siteName = site?.name ? String(site.name) : null;

    const acknowledgements = (acks ?? []).map((a) => {
      const u = userMap.get(a.user_id);
      const sig = (a.signature_url ?? "").toString().trim();
      return {
        userId: a.user_id,
        name: u?.name ?? "—",
        role: u?.role ?? "—",
        acknowledgedAt: a.acknowledged_at,
        hasSignature: Boolean(sig),
        signatureUrl: sig || null,
      };
    });

    return NextResponse.json({
      briefing: {
        id: briefing.id,
        title: briefing.title ?? "Untitled",
        siteId: briefing.site_id,
        siteName,
        createdAt: briefing.created_at,
      },
      acknowledgements,
    });
  } catch (e) {
    console.error("GET /api/briefings/[id]/acknowledgements:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
