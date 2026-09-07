import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export const dynamic = "force-dynamic";

function escapeCsv(val: string): string {
  if (val == null || val === "") return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** GET /api/briefings/report - CSV of who has signed/accepted each briefing. Admin/supervisor only. */
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

    if (role !== "superuser" && role !== "admin" && role !== "supervisor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (role === "superuser") companyId = searchParams.get("companyId") || companyId || undefined;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }

    const singleBriefingId = searchParams.get("briefingId")?.trim() || null;

    let briefingsQuery = supabaseAdmin
      .from("briefings")
      .select("id, title, created_at, site_id, company_id")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (singleBriefingId) {
      briefingsQuery = briefingsQuery.eq("id", singleBriefingId);
    }

    const { data: briefings } = await briefingsQuery;

    if (!briefings?.length) {
      const header = "Briefing Title,Briefing Created,Site,User Name,User Email,Acknowledged At,Has Signature\n";
      const noData = singleBriefingId ? "No briefing or acknowledgements for this item\n" : "No briefings or acknowledgements\n";
      const csv = header + noData;
      const slug = singleBriefingId ? `briefing-${singleBriefingId.slice(0, 8)}` : `briefings-report-${companyId}`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const briefingIds = briefings.map((b) => b.id);
    const { data: acks } = await supabaseAdmin
      .from("briefing_acknowledgements")
      .select("briefing_id, user_id, acknowledged_at, signature_url")
      .in("briefing_id", briefingIds);

    const userIds = [...new Set((acks ?? []).map((a) => a.user_id).filter(Boolean))];
    const { data: users } = userIds.length
      ? await supabaseAdmin
          .from("users")
          .select("id, name, display_name, email")
          .in("id", userIds)
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

    const siteIds = [...new Set(briefings.map((b) => b.site_id).filter(Boolean))] as string[];
    const { data: sites } =
      siteIds.length > 0
        ? await supabaseAdmin.from("sites").select("id, name").in("id", siteIds)
        : { data: [] };
    const siteMap = new Map((sites ?? []).map((s) => [s.id, (s.name ?? "—").toString()]));

    const briefingMap = new Map(
      briefings.map((b) => [
        b.id,
        {
          title: (b.title ?? "Untitled").toString(),
          created_at: b.created_at,
          site_name: b.site_id ? siteMap.get(b.site_id) ?? b.site_id : "All sites",
        },
      ])
    );

    const rows: string[][] = [
      ["Briefing Title", "Briefing Created", "Site", "User Name", "User Email", "Acknowledged At", "Has Signature"],
    ];

    for (const a of acks ?? []) {
      const b = briefingMap.get(a.briefing_id);
      const u = userMap.get(a.user_id);
      if (!b) continue;
      // en-GB locale strings often include a comma between date and time — must CSV-escape or columns shift in Excel.
      const createdStr = b.created_at ? new Date(b.created_at).toLocaleString("en-GB") : "";
      const ackStr = a.acknowledged_at ? new Date(a.acknowledged_at).toLocaleString("en-GB") : "";
      rows.push([
        escapeCsv(b.title),
        escapeCsv(createdStr),
        escapeCsv(b.site_name ?? ""),
        escapeCsv(u?.name ?? "—"),
        escapeCsv(u?.email ?? "—"),
        escapeCsv(ackStr),
        escapeCsv(a.signature_url ? "Yes" : "No"),
      ]);
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    const bom = "\uFEFF";

    const fileSlug = singleBriefingId
      ? `briefing-acknowledgements-${singleBriefingId.slice(0, 8)}`
      : `briefings-report-${companyId}`;
    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileSlug}-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("GET /api/briefings/report failed:", e);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
