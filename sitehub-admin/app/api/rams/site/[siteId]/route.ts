import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function toTime(a: unknown): number {
  if (!a) return 0;
  if (a instanceof Date) return a.getTime();
  if (typeof (a as { toDate?: () => Date }).toDate === "function") return (a as { toDate: () => Date }).toDate().getTime();
  return new Date(a as string).getTime();
}

export async function GET(_req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  try {
    const { siteId } = await params;
    if (!siteId) return NextResponse.json({ error: "Site ID required" }, { status: 400 });

    const { data: site } = await supabaseAdmin.from("sites").select("*").eq("id", siteId).single();
    if (!site) return NextResponse.json({ error: "Site not found" }, { status: 404 });

    const { data } = await supabaseAdmin
      .from("rams")
      .select("*")
      .eq("site_id", siteId);

    const approved = (data ?? [])
      .map((d) => ({ id: d.id, ...d }))
      .sort((a, b) => toTime(b.created_at ?? b.createdAt) - toTime(a.created_at ?? a.createdAt));

    if (approved.length === 0) {
      return NextResponse.json({
        ramsVersion: (site.rams_version ?? site.ramsversion ?? null) as string | null,
        ramsUpdatedAt: (site as Record<string, unknown>).rams_updated_at ?? (site as Record<string, unknown>).ramsUpdatedAt ?? null,
        fileUrl: null,
        title: null,
      });
    }

    const ram = approved[0] as Record<string, unknown>;
    return NextResponse.json({
      id: ram.id,
      fileUrl: ram.url ?? ram.file_url ?? ram.fileUrl ?? null,
      title: ram.title ?? null,
      ramsVersion: (site.rams_version ?? site.ramsversion ?? null) as string | null,
      ramsUpdatedAt: (site as Record<string, unknown>).rams_updated_at ?? (site as Record<string, unknown>).ramsUpdatedAt ?? null,
    });
  } catch (e) {
    console.error("GET /api/rams/site/[siteId]:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
