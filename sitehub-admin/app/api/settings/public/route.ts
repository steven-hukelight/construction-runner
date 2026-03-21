import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** GET /api/settings/public - Public settings for banners, register page, etc. No auth required. */
export async function GET() {
  try {
    const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";
    const { data } = await supabaseAdmin.from("settings").select("config").eq("id", GLOBAL_ID).single();
    const cfg = (data?.config as Record<string, unknown>) ?? {};
    const branding = (cfg.branding as Record<string, unknown>) ?? {};
    const featureToggles = (cfg.featureToggles as Record<string, unknown>) ?? {};
    const announcements = (cfg.announcements as Record<string, unknown>) ?? {};
    const maintenanceMode = featureToggles.maintenanceMode ?? cfg.maintenance ?? false;
    const registrationsOpen = featureToggles.registrationsOpen ?? cfg.featureA ?? true;
    return NextResponse.json({
      appName: branding.appName ?? cfg.brandName ?? "Construction Runner",
      supportEmail: branding.supportEmail ?? "",
      announcement: (announcements.message as string) ?? (cfg.announcement as string) ?? "",
      maintenanceMode: maintenanceMode === true || maintenanceMode === "true",
      registrationsOpen: registrationsOpen !== false && registrationsOpen !== "false",
    });
  } catch (e: unknown) {
    console.error("GET /api/settings/public failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({
      appName: "Construction Runner",
      supportEmail: "",
      announcement: "",
      maintenanceMode: false,
      registrationsOpen: true,
    });
  }
}
