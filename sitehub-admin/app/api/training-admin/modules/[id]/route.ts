import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { loadModule, withCompanyMaterial, type CompanyModuleRow, COMPANY_MODULE_COLUMNS } from "@/lib/training/service";
import { isPlayable } from "@/lib/training/rules";

/**
 * `{ enabled?, refreshMonths?, scope?, siteIds? }` for this company. `refreshMonths: null` turns
 * refresh off. `scope: "sites"` needs at least one of the company's sites in `siteIds`.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canConfigure) return NextResponse.json({ error: "Only a Super Admin can change training settings" }, { status: 403 });
  try {
    const { id } = await params;
    const trainingModule = await loadModule(id);
    if (!trainingModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as { enabled?: unknown; refreshMonths?: unknown; scope?: unknown; siteIds?: unknown };
    const { data: existing } = await supabaseAdmin
      .from("company_training_modules")
      .select(COMPANY_MODULE_COLUMNS)
      .eq("company_id", auth.companyId)
      .eq("module_id", id)
      .maybeSingle<CompanyModuleRow>();

    const enabled = typeof body.enabled === "boolean" ? body.enabled : existing?.enabled ?? false;
    if (enabled && trainingModule.kind === "video" && !isPlayable(withCompanyMaterial(trainingModule, existing))) {
      return NextResponse.json({ error: "This module has no video yet" }, { status: 409 });
    }

    let refreshMonths: number | null = existing ? existing.refresh_months : 12;
    if (body.refreshMonths === null) refreshMonths = null;
    else if (body.refreshMonths !== undefined) {
      const n = Number(body.refreshMonths);
      if (!Number.isInteger(n) || n < 1 || n > 60) {
        return NextResponse.json({ error: "Refresh must be 1 to 60 months, or off" }, { status: 400 });
      }
      refreshMonths = n;
    }

    let scope = existing?.scope ?? "company";
    if (body.scope !== undefined) {
      if (body.scope !== "company" && body.scope !== "sites") {
        return NextResponse.json({ error: "Choose the whole company or chosen sites" }, { status: 400 });
      }
      scope = body.scope;
    }
    let siteIds: string[] | null = null;
    if (body.siteIds !== undefined) {
      if (!Array.isArray(body.siteIds)) return NextResponse.json({ error: "siteIds must be a list" }, { status: 400 });
      const requested = [...new Set(body.siteIds.map((v) => String(v ?? "").trim()).filter(Boolean))];
      const { data: owned, error: sitesError } = requested.length
        ? await supabaseAdmin.from("sites").select("id").eq("company_id", auth.companyId).in("id", requested)
        : { data: [], error: null };
      if (sitesError) throw new Error(`sites: ${sitesError.message}`);
      if ((owned ?? []).length !== requested.length) {
        return NextResponse.json({ error: "One of those sites isn't in your company" }, { status: 400 });
      }
      siteIds = requested;
    }
    if (scope === "sites") {
      const count = siteIds
        ? siteIds.length
        : (
            await supabaseAdmin
              .from("company_training_module_sites")
              .select("site_id", { count: "exact", head: true })
              .eq("company_id", auth.companyId)
              .eq("module_id", id)
          ).count ?? 0;
      if (count === 0) return NextResponse.json({ error: "Choose at least one site" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("company_training_modules").upsert(
      {
        company_id: auth.companyId,
        module_id: id,
        enabled,
        refresh_months: refreshMonths,
        scope,
        updated_at: new Date().toISOString(),
        updated_by: auth.uid,
      },
      { onConflict: "company_id,module_id" },
    );
    if (error) {
      console.error("PATCH /api/training-admin/modules/[id]:", error);
      return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
    }
    if (siteIds) {
      const { error: clearError } = await supabaseAdmin
        .from("company_training_module_sites")
        .delete()
        .eq("company_id", auth.companyId)
        .eq("module_id", id);
      const { error: sitesError } =
        clearError || !siteIds.length
          ? { error: clearError }
          : await supabaseAdmin
              .from("company_training_module_sites")
              .insert(siteIds.map((siteId) => ({ company_id: auth.companyId, module_id: id, site_id: siteId })));
      if (sitesError) {
        console.error("PATCH /api/training-admin/modules/[id] sites:", sitesError);
        return NextResponse.json({ error: "Couldn't save the sites" }, { status: 500 });
      }
    }
    return NextResponse.json({ ok: true, enabled, refreshMonths, scope });
  } catch (e) {
    console.error("PATCH /api/training-admin/modules/[id]:", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}
