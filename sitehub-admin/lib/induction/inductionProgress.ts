import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSiteSafetyPack } from "@/lib/induction/safetyPackStore";
import { isValidCompletedSiteInduction } from "@/lib/induction/validSiteInduction";

export type InductionRamsItem = {
  id: string;
  title: string;
  acknowledged: boolean;
};

export type InductionProgress = {
  siteId: string;
  siteName: string;
  safety: { required: boolean; acked: boolean; sections: { id: string; title: string; body: string }[] };
  rams: { required: boolean; items: InductionRamsItem[] };
  rules: { required: boolean; acked: boolean; items: { id: string; title: string; category: string; description: string }[] };
  canComplete: boolean;
  inductionStatus: string;
  inductionCompleted: boolean;
};

async function loadInductionRow(userId: string, siteId: string) {
  const { data } = await supabaseAdmin
    .from("user_site_inductions")
    .select("status, completed_at, safety_acked_at, rules_acked_at")
    .eq("user_id", userId)
    .eq("site_id", siteId)
    .maybeSingle();
  return data;
}

export async function getInductionProgress(opts: {
  userId: string;
  siteId: string;
  companyId?: string | null;
  ensureSafetyCopy?: boolean;
}): Promise<InductionProgress | null> {
  const userId = String(opts.userId ?? "").trim();
  const siteId = String(opts.siteId ?? "").trim();
  if (!userId || !siteId) return null;

  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("id, name, company_id")
    .eq("id", siteId)
    .maybeSingle();
  if (!site) return null;

  const companyId = String(opts.companyId ?? site.company_id ?? "").trim();
  const pack = await getSiteSafetyPack(siteId, {
    companyId,
    ensureCopy: opts.ensureSafetyCopy === true,
    updatedBy: userId,
  });
  const row = await loadInductionRow(userId, siteId);

  const { data: ramsRows } = await supabaseAdmin
    .from("rams")
    .select("id, title")
    .eq("site_id", siteId);
  const ramsIds = (ramsRows ?? []).map((r) => String(r.id));
  let acknowledged = new Set<string>();
  if (ramsIds.length) {
    const { data: acks } = await supabaseAdmin
      .from("rams_acknowledgements")
      .select("rams_id")
      .eq("user_id", userId)
      .in("rams_id", ramsIds);
    acknowledged = new Set((acks ?? []).map((a) => String(a.rams_id)));
  }
  const ramsItems: InductionRamsItem[] = (ramsRows ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? r.id),
    acknowledged: acknowledged.has(String(r.id)),
  }));

  const { data: ruleRows } = await supabaseAdmin
    .from("site_rules")
    .select("id, title, category, body")
    .eq("site_id", siteId);
  const rules = (ruleRows ?? []).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? ""),
    category: String(r.category ?? ""),
    description: String(r.body ?? ""),
  }));

  const safetyRequired = pack.source === "site" && pack.hasContent;
  const ramsRequired = ramsItems.length > 0;
  const rulesRequired = rules.length > 0;
  const safetyAcked = !!row?.safety_acked_at;
  const rulesAcked = !!row?.rules_acked_at;
  const ramsDone = !ramsRequired || ramsItems.every((item) => item.acknowledged);
  const canComplete =
    (!safetyRequired || safetyAcked) &&
    ramsDone &&
    (!rulesRequired || rulesAcked);

  const completed = row ? isValidCompletedSiteInduction(row) : false;

  return {
    siteId,
    siteName: String(site.name ?? siteId),
    safety: { required: safetyRequired, acked: safetyAcked, sections: pack.sections },
    rams: { required: ramsRequired, items: ramsItems },
    rules: { required: rulesRequired, acked: rulesAcked, items: rules },
    canComplete,
    inductionStatus: completed ? "completed" : String(row?.status ?? "not_started"),
    inductionCompleted: completed,
  };
}

export async function ackInductionStep(opts: {
  userId: string;
  siteId: string;
  kind: "safety" | "rules";
}): Promise<void> {
  const now = new Date().toISOString();
  const patch =
    opts.kind === "safety"
      ? { safety_acked_at: now, updated_at: now }
      : { rules_acked_at: now, updated_at: now };

  const { data: existing } = await supabaseAdmin
    .from("user_site_inductions")
    .select("status, completed_at")
    .eq("user_id", opts.userId)
    .eq("site_id", opts.siteId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("user_site_inductions")
      .update(patch)
      .eq("user_id", opts.userId)
      .eq("site_id", opts.siteId);
    return;
  }

  await supabaseAdmin.from("user_site_inductions").insert({
    user_id: opts.userId,
    site_id: opts.siteId,
    status: "not_started",
    ...patch,
  });
}
