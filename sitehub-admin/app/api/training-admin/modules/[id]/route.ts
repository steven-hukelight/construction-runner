import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import {
  COMPANY_MODULE_COLUMNS,
  loadCompanyQuestions,
  loadModule,
  withCompanyMaterial,
  type CompanyModuleRow,
} from "@/lib/training/service";
import { companyModuleDetails } from "@/lib/training/companyModules";
import { isPlayable } from "@/lib/training/rules";

/**
 * `{ enabled?, refreshMonths?, scope?, siteIds?, requiredForSignIn? }` for this company.
 * `refreshMonths: null` turns refresh off. `scope: "sites"` needs at least one of the company's
 * sites in `siteIds`. On the company's own modules, `title`, `summary` and `minutes` too.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canConfigure) return NextResponse.json({ error: "Only a Super Admin can change training settings" }, { status: 403 });
  try {
    const { id } = await params;
    const trainingModule = await loadModule(id, auth.companyId);
    if (!trainingModule) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as {
      enabled?: unknown;
      refreshMonths?: unknown;
      scope?: unknown;
      siteIds?: unknown;
      requiredForSignIn?: unknown;
      title?: unknown;
      summary?: unknown;
      minutes?: unknown;
    };
    const ownModule = trainingModule.company_id === auth.companyId;
    if (!ownModule && (body.title !== undefined || body.summary !== undefined || body.minutes !== undefined)) {
      return NextResponse.json({ error: "Only your company's own modules can be renamed" }, { status: 403 });
    }
    if (ownModule && (body.title !== undefined || body.summary !== undefined || body.minutes !== undefined)) {
      const details = companyModuleDetails(
        {
          title: body.title ?? trainingModule.title,
          summary: body.summary ?? trainingModule.summary,
          minutes: body.minutes === undefined ? trainingModule.minutes : body.minutes,
        },
      );
      if ("error" in details) return NextResponse.json({ error: details.error }, { status: 400 });
      const { error: detailsError } = await supabaseAdmin
        .from("training_modules")
        .update({ ...details, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("company_id", auth.companyId);
      if (detailsError) throw new Error(`training_modules: ${detailsError.message}`);
    }
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
    if (enabled && ownModule && !(await loadCompanyQuestions(id, auth.companyId)).length) {
      return NextResponse.json({ error: "Write the five questions before switching it on" }, { status: 409 });
    }
    if (body.requiredForSignIn !== undefined && typeof body.requiredForSignIn !== "boolean") {
      return NextResponse.json({ error: "requiredForSignIn must be true or false" }, { status: 400 });
    }
    const requiredForSignIn =
      typeof body.requiredForSignIn === "boolean" ? body.requiredForSignIn : existing?.required_for_sign_in ?? false;

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
        required_for_sign_in: requiredForSignIn,
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
    return NextResponse.json({ ok: true, enabled, refreshMonths, scope, requiredForSignIn });
  } catch (e) {
    console.error("PATCH /api/training-admin/modules/[id]:", e);
    return NextResponse.json({ error: "Couldn't save" }, { status: 500 });
  }
}

/** Archives one of the company's own modules. Past results stay on record. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canConfigure) return NextResponse.json({ error: "Only a Super Admin can change training settings" }, { status: 403 });
  try {
    const { id } = await params;
    const trainingModule = await loadModule(id, auth.companyId);
    if (!trainingModule || trainingModule.company_id !== auth.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const now = new Date().toISOString();
    const [archived, switchedOff] = await Promise.all([
      supabaseAdmin.from("training_modules").update({ active: false, updated_at: now }).eq("id", id).eq("company_id", auth.companyId),
      supabaseAdmin
        .from("company_training_modules")
        .update({ enabled: false, required_for_sign_in: false, updated_at: now, updated_by: auth.uid })
        .eq("company_id", auth.companyId)
        .eq("module_id", id),
    ]);
    if (archived.error || switchedOff.error) {
      console.error("DELETE /api/training-admin/modules/[id]:", archived.error ?? switchedOff.error);
      return NextResponse.json({ error: "Couldn't remove it" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/training-admin/modules/[id]:", e);
    return NextResponse.json({ error: "Couldn't remove it" }, { status: 500 });
  }
}
