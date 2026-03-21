import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** POST /api/settings/global - Save settings. Supports { section, config } or legacy format. */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));

    const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";
    if (body.section && body.config) {
      const { data: existing } = await supabaseAdmin.from("settings").select("config").eq("id", GLOBAL_SETTINGS_ID).maybeSingle();
      const existingConfig = existing?.config && typeof existing.config === "object"
        ? JSON.parse(JSON.stringify(existing.config)) as Record<string, unknown>
        : {};
      const newSection = typeof body.config === "object" && body.config !== null
        ? JSON.parse(JSON.stringify(body.config)) as Record<string, unknown>
        : body.config;
      let merged: Record<string, unknown> = { ...existingConfig, [body.section]: newSection };
      // Keep legacy top-level keys in sync for featureToggles (featureA=registrationsOpen, maintenance)
      if (body.section === "featureToggles") {
        const ft = newSection as Record<string, unknown>;
        merged = {
          ...merged,
          featureA: ft?.registrationsOpen ?? existingConfig?.featureA ?? true,
          maintenance: ft?.maintenanceMode ?? existingConfig?.maintenance ?? false,
        };
      }
      const { error } = await supabaseAdmin.from("settings").upsert(
        { id: GLOBAL_SETTINGS_ID, key: "global", config: merged },
        { onConflict: "id" }
      );
      if (error) {
        console.error("POST /api/settings/global upsert error:", error);
        const msg = process.env.NODE_ENV === "development"
          ? `Failed to save: ${error.message} (code: ${error.code})`
          : "Failed to save settings";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const { brandName, primaryColor, featureA, featureB, announcement, maintenance } = body;
    const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";
    const { data: existing } = await supabaseAdmin.from("settings").select("config").eq("id", GLOBAL_ID).maybeSingle();
    const existingConfig = existing?.config && typeof existing.config === "object"
      ? JSON.parse(JSON.stringify(existing.config)) as Record<string, unknown>
      : {};
    const existingFt = (existingConfig?.featureToggles as Record<string, unknown>) ?? {};
    const config = {
      ...existingConfig,
      brandName: brandName ?? existingConfig?.brandName ?? "Construction Runner",
      primaryColor: primaryColor ?? existingConfig?.primaryColor ?? "#2563eb",
      featureA: featureA !== undefined ? !!featureA : (existingConfig?.featureA ?? true),
      featureB: featureB !== undefined ? !!featureB : (existingConfig?.featureB ?? false),
      announcement: announcement !== undefined ? (announcement ?? "") : (existingConfig?.announcement ?? ""),
      maintenance: maintenance !== undefined ? !!maintenance : (existingConfig?.maintenance ?? false),
      featureToggles: {
        ...existingFt,
        registrationsOpen: featureA !== undefined ? !!featureA : (existingFt?.registrationsOpen ?? true),
        maintenanceMode: maintenance !== undefined ? !!maintenance : (existingFt?.maintenanceMode ?? false),
      },
    };
    const { error } = await supabaseAdmin.from("settings").upsert(
      { id: GLOBAL_ID, key: "global", config },
      { onConflict: "id" }
    );
    if (error) {
      console.error("POST /api/settings/global legacy upsert error:", error);
      const msg = process.env.NODE_ENV === "development"
        ? `Failed to save: ${error.message} (code: ${error.code})`
        : "Failed to save settings";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("POST /api/settings/global failed:", msg);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** GET /api/settings/global - Load global settings. Superuser only. */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get("role")?.value;
    const roleLower = (role ?? "").toLowerCase();
    if (roleLower !== "superuser") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const GLOBAL_ID = "00000000-0000-0000-0000-000000000001";
    const { data } = await supabaseAdmin.from("settings").select("config").eq("id", GLOBAL_ID).maybeSingle();
    const cfg = data?.config as Record<string, unknown> | null ?? {};
    const branding = (cfg?.branding as Record<string, unknown>) ?? {};
    const featureToggles = (cfg?.featureToggles as Record<string, unknown>) ?? {};
    const securityCfg = (cfg?.security as Record<string, unknown>) ?? {};
    const announcements = (cfg?.announcements as Record<string, unknown>) ?? {};
    const announcementMsg = (announcements?.message as string) ?? (cfg?.announcement as string) ?? "";
    return NextResponse.json({
      brandName: cfg?.brandName ?? branding?.appName ?? "Construction Runner",
      appName: branding?.appName ?? cfg?.brandName ?? "Construction Runner",
      supportEmail: branding?.supportEmail ?? "",
      primaryColor: cfg?.primaryColor ?? "#2563eb",
      featureA: cfg?.featureA ?? featureToggles?.registrationsOpen ?? true,
      featureB: cfg?.featureB ?? false,
      registrationsOpen: featureToggles?.registrationsOpen ?? cfg?.featureA ?? true,
      maintenanceMode: featureToggles?.maintenanceMode ?? cfg?.maintenance ?? false,
      maintenance: cfg?.maintenance ?? featureToggles?.maintenanceMode ?? false,
      announcement: announcementMsg,
      branding,
      featureToggles,
      security: securityCfg,
      announcements: { message: announcementMsg },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/settings/global failed:", msg);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
