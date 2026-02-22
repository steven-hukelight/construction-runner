import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** POST /api/settings/global - Save settings. Supports { section, config } or legacy format. */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));

    const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
    if (body.section && body.config) {
      const { data: existing } = await supabaseAdmin.from("settings").select("config").eq("id", GLOBAL_SETTINGS_ID).single();
      const merged = { ...(existing?.config as object || {}), [body.section]: body.config };
      await supabaseAdmin.from("settings").upsert({ id: GLOBAL_SETTINGS_ID, companyId: null, config: merged }, { onConflict: "id" });
      return NextResponse.json({ ok: true });
    }

    const { brandName, primaryColor, featureA, featureB, announcement, maintenance } = body;
    const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";
    await supabaseAdmin.from("settings").upsert({
      id: GLOBAL_ID,
      companyId: null,
      config: {
        brandName: brandName ?? "SiteHub",
        primaryColor: primaryColor ?? "#2563eb",
        featureA: !!featureA,
        featureB: !!featureB,
        announcement: announcement ?? "",
        maintenance: !!maintenance,
      },
    }, { onConflict: "id" });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("POST /api/settings/global failed:", e?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET /api/settings/global - Load global settings. Superuser only. */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    if (role !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";
    const { data } = await supabaseAdmin.from("settings").select("config").eq("id", GLOBAL_ID).single();
    const cfg = data?.config as Record<string, unknown> | null ?? {};
    return NextResponse.json({
      brandName: cfg?.brandName ?? "SiteHub",
      primaryColor: cfg?.primaryColor ?? "#2563eb",
      featureA: cfg?.featureA ?? true,
      featureB: cfg?.featureB ?? false,
      announcement: cfg?.announcement ?? "",
      maintenance: cfg?.maintenance ?? false,
    });
  } catch (e: any) {
    console.error("GET /api/settings/global failed:", e?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
