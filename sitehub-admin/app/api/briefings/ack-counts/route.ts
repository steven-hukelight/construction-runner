import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export const dynamic = "force-dynamic";

/** GET — { counts: { [briefingId]: number } } for the current company. */
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

    const { data: briefings } = await supabaseAdmin.from("briefings").select("id").eq("company_id", companyId);
    const ids = (briefings ?? []).map((b) => b.id).filter(Boolean);
    if (!ids.length) {
      return NextResponse.json({ counts: {} });
    }

    const { data: acks } = await supabaseAdmin.from("briefing_acknowledgements").select("briefing_id").in("briefing_id", ids);

    const counts: Record<string, number> = {};
    for (const id of ids) counts[id] = 0;
    for (const a of acks ?? []) {
      const bid = a.briefing_id as string;
      if (bid) counts[bid] = (counts[bid] ?? 0) + 1;
    }

    return NextResponse.json({ counts });
  } catch (e) {
    console.error("GET /api/briefings/ack-counts:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
