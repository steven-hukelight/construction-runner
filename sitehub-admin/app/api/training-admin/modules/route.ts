import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveTrainingOfficeAuth } from "@/lib/training/officeAuth";
import { companyModuleDetails } from "@/lib/training/companyModules";

/** Company modules sort after the shared catalogue. */
const COMPANY_MODULE_SORT_ORDER = 1000;

/**
 * `{ title, summary?, minutes? }`. Creates one of the company's own modules, switched off.
 * It needs a video or PDF and five questions before it can be switched on.
 */
export async function POST(req: Request) {
  const auth = await resolveTrainingOfficeAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.canConfigure) return NextResponse.json({ error: "Only a Super Admin can add training" }, { status: 403 });
  try {
    const body = (await req.json().catch(() => ({}))) as { title?: unknown; summary?: unknown; minutes?: unknown };
    const details = companyModuleDetails({ title: body.title, summary: body.summary, minutes: body.minutes });
    if ("error" in details) return NextResponse.json({ error: details.error }, { status: 400 });

    const id = `co-${randomUUID()}`;
    const { error } = await supabaseAdmin.from("training_modules").insert({
      id,
      kind: "video",
      ...details,
      sort_order: COMPANY_MODULE_SORT_ORDER,
      company_id: auth.companyId,
      active: true,
    });
    if (error) {
      console.error("POST /api/training-admin/modules:", error);
      return NextResponse.json({ error: "Couldn't add the module" }, { status: 500 });
    }
    const { error: settingError } = await supabaseAdmin.from("company_training_modules").insert({
      company_id: auth.companyId,
      module_id: id,
      enabled: false,
      refresh_months: 12,
      scope: "company",
      updated_by: auth.uid,
    });
    if (settingError) {
      console.error("POST /api/training-admin/modules setting:", settingError);
      await supabaseAdmin.from("training_modules").delete().eq("id", id);
      return NextResponse.json({ error: "Couldn't add the module" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("POST /api/training-admin/modules:", e);
    return NextResponse.json({ error: "Couldn't add the module" }, { status: 500 });
  }
}
