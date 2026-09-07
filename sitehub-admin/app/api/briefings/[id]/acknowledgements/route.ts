import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

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

    const userIds = [...new Set((acks ?? []).map((a) => a.user_id).filter(Boolean))];
    const { data: users } = userIds.length
      ? await supabaseAdmin.from("users").select("id, name, display_name, email").in("id", userIds)
      : { data: [] };

    const userMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        {
          name: (u.display_name ?? u.name ?? u.email ?? "—").toString(),
          email: (u.email ?? "—").toString(),
        },
      ])
    );

    let siteName: string | null = null;
    if (briefing.site_id) {
      const { data: site } = await supabaseAdmin.from("sites").select("name").eq("id", briefing.site_id).maybeSingle();
      siteName = site?.name ? String(site.name) : null;
    }

    const acknowledgements = (acks ?? []).map((a) => {
      const u = userMap.get(a.user_id);
      return {
        userId: a.user_id,
        name: u?.name ?? "—",
        email: u?.email ?? "—",
        acknowledgedAt: a.acknowledged_at,
        hasSignature: Boolean(a.signature_url),
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
