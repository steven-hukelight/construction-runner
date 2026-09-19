import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  defaultInductionSafetySections,
  normalizeSafetySections,
  safetyPackHasContent,
  type SafetySection,
} from "@/lib/induction/safetyPack";

export async function getCompanySafetyTemplate(companyId: string): Promise<{
  sections: SafetySection[];
  exists: boolean;
  updatedAt: string | null;
}> {
  const cid = String(companyId ?? "").trim();
  if (!cid) return { sections: defaultInductionSafetySections(), exists: false, updatedAt: null };
  const { data } = await supabaseAdmin
    .from("induction_safety_templates")
    .select("sections, updated_at")
    .eq("company_id", cid)
    .maybeSingle();
  if (!data) {
    return { sections: defaultInductionSafetySections(), exists: false, updatedAt: null };
  }
  const sections = normalizeSafetySections(data.sections);
  return {
    sections: sections.length ? sections : defaultInductionSafetySections(),
    exists: true,
    updatedAt: data.updated_at ? String(data.updated_at) : null,
  };
}

export async function saveCompanySafetyTemplate(
  companyId: string,
  sections: SafetySection[],
  updatedBy?: string | null,
): Promise<SafetySection[]> {
  const cid = String(companyId ?? "").trim();
  const normalized = normalizeSafetySections(sections);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("induction_safety_templates").upsert(
    {
      company_id: cid,
      sections: normalized,
      updated_at: now,
      updated_by: updatedBy || null,
    },
    { onConflict: "company_id" },
  );
  if (error) throw error;
  return normalized;
}

export async function getSiteSafetyPack(
  siteId: string,
  opts?: { companyId?: string | null; ensureCopy?: boolean; updatedBy?: string | null },
): Promise<{
  sections: SafetySection[];
  source: "site" | "template";
  hasContent: boolean;
}> {
  const sid = String(siteId ?? "").trim();
  const companyId = String(opts?.companyId ?? "").trim();
  if (!sid) return { sections: [], source: "template", hasContent: false };

  const { data: siteRow } = await supabaseAdmin
    .from("site_induction_safety")
    .select("sections, company_id")
    .eq("site_id", sid)
    .maybeSingle();

  if (siteRow) {
    const sections = normalizeSafetySections(siteRow.sections);
    return {
      sections,
      source: "site",
      hasContent: safetyPackHasContent(sections),
    };
  }

  let cid = companyId;
  if (!cid) {
    const { data: site } = await supabaseAdmin
      .from("sites")
      .select("company_id")
      .eq("id", sid)
      .maybeSingle();
    cid = String(site?.company_id ?? "");
  }

  const template = await getCompanySafetyTemplate(cid);
  if (opts?.ensureCopy && cid) {
    const now = new Date().toISOString();
    await supabaseAdmin.from("site_induction_safety").upsert(
      {
        site_id: sid,
        company_id: cid,
        sections: template.sections,
        copied_from_template_at: now,
        updated_at: now,
        updated_by: opts.updatedBy || null,
      },
      { onConflict: "site_id" },
    );
    return {
      sections: template.sections,
      source: "site",
      hasContent: safetyPackHasContent(template.sections),
    };
  }

  return {
    sections: template.sections,
    source: "template",
    hasContent: safetyPackHasContent(template.sections),
  };
}

export async function saveSiteSafetyPack(
  siteId: string,
  companyId: string,
  sections: SafetySection[],
  updatedBy?: string | null,
): Promise<SafetySection[]> {
  const normalized = normalizeSafetySections(sections);
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("site_induction_safety").upsert(
    {
      site_id: siteId,
      company_id: companyId,
      sections: normalized,
      updated_at: now,
      updated_by: updatedBy || null,
    },
    { onConflict: "site_id" },
  );
  if (error) throw error;
  return normalized;
}

export async function resetSiteSafetyPack(
  siteId: string,
  companyId: string,
  updatedBy?: string | null,
): Promise<SafetySection[]> {
  const template = await getCompanySafetyTemplate(companyId);
  return saveSiteSafetyPack(siteId, companyId, template.sections, updatedBy);
}
