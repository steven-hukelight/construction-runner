import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { userIdsSignedInAtSite } from "@/lib/auth/siteAudience";
import { isPlatformSuperuser, usesAssignedSites } from "@/lib/auth/roles";
import {
  cardFlags,
  checkRequirement,
  normaliseCardNumber,
  requirementLabel,
  ticketLabel,
  type CardFlag,
  type HeldCard,
  type HeldTicket,
  type Holdings,
  type Requirement,
} from "@/lib/competence/rules";

export type SubjectType = "rams" | "task";

export type RequirementRow = Requirement & { id: string; subject_type: SubjectType; subject_id: string; company_id: string };

const CLOSED_TASK_STATUSES = new Set(["DONE", "COMPLETED", "CANCELLED", "CLOSED"]);

function chunks<T>(items: T[], size = 200): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function cardFromRow(row: Record<string, unknown> | null | undefined): HeldCard | null {
  if (!row) return null;
  return {
    type: (row.card_type as string | null) ?? null,
    level: (row.card_level as string | null) ?? null,
    number: (row.card_number as string | null) ?? null,
    expiry: (row.expiry as string | null) ?? null,
    checkedAt: (row.checked_at as string | null) ?? null,
  };
}

/** Certificates from the pre-induction list. "Other" entries use their notes as the name. */
export function ticketsFromPreInduction(row: Record<string, unknown> | null | undefined): HeldTicket[] {
  if (!row) return [];
  const list = Array.isArray(row.certifications) ? row.certifications : Array.isArray(row.data) ? row.data : [];
  const out: HeldTicket[] = [];
  for (const raw of list as Record<string, unknown>[]) {
    if (!raw || typeof raw !== "object") continue;
    const type = String(raw.type ?? "").trim();
    const notes = String(raw.notes ?? "").trim();
    const name = type && type.toLowerCase() !== "other" ? type : notes;
    if (!name) continue;
    const expiry = (raw.expiry ?? raw.expiry_date ?? null) as string | null;
    out.push({ code: name, label: ticketLabel(name), expiry: expiry || null });
  }
  return out;
}

/** What each worker holds: their competency card plus every certificate, from both certificate stores. */
export async function loadHoldings(userIds: string[]): Promise<Map<string, Holdings>> {
  const out = new Map<string, Holdings>();
  for (const id of userIds) out.set(id, { card: null, tickets: [] });
  for (const ids of chunks([...new Set(userIds)])) {
    const [cards, certs, preCerts] = await Promise.all([
      supabaseAdmin
        .from("pre_induction_competency_card")
        .select("user_id, card_type, card_level, card_number, expiry, checked_at")
        .in("user_id", ids),
      supabaseAdmin.from("certifications").select("user_id, type, title, expires_at").in("user_id", ids),
      supabaseAdmin.from("pre_induction_certifications").select("user_id, certifications, data").in("user_id", ids),
    ]);
    if (cards.error) throw new Error(`loadHoldings cards: ${cards.error.message}`);
    for (const row of cards.data ?? []) {
      const h = out.get(String(row.user_id));
      if (h) h.card = cardFromRow(row);
    }
    for (const row of certs.data ?? []) {
      const h = out.get(String(row.user_id));
      const name = String(row.title || row.type || "").trim();
      if (h && name) h.tickets.push({ code: name, label: ticketLabel(name), expiry: (row.expires_at as string | null) ?? null });
    }
    for (const row of preCerts.data ?? []) {
      const h = out.get(String(row.user_id));
      if (h) h.tickets.push(...ticketsFromPreInduction(row));
    }
  }
  return out;
}

export async function loadRequirements(subjectType: SubjectType, subjectIds: string[]): Promise<RequirementRow[]> {
  if (!subjectIds.length) return [];
  const rows: RequirementRow[] = [];
  for (const ids of chunks(subjectIds)) {
    const { data, error } = await supabaseAdmin
      .from("competence_requirements")
      .select("id, company_id, subject_type, subject_id, kind, code, level")
      .eq("subject_type", subjectType)
      .in("subject_id", ids)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`loadRequirements: ${error.message}`);
    rows.push(...((data ?? []) as RequirementRow[]));
  }
  return rows;
}

/** The RAMS or task, when it belongs to the caller's company (any company for the platform superuser). */
export async function loadSubject(
  subjectType: SubjectType,
  subjectId: string,
  auth: { role: string | null; companyId: string | null },
): Promise<{ id: string; company_id: string; title: string } | null> {
  const table = subjectType === "rams" ? "rams" : "tasks";
  const { data } = await supabaseAdmin.from(table).select("id, company_id, title").eq("id", subjectId).maybeSingle();
  if (!data) return null;
  const companyId = String(data.company_id ?? "");
  if (!isPlatformSuperuser(auth.role) && companyId !== (auth.companyId ?? "")) return null;
  return { id: String(data.id), company_id: companyId, title: String(data.title ?? "") };
}

/** Replaces the requirement list on a RAMS or task. */
export async function saveRequirements(opts: {
  subjectType: SubjectType;
  subjectId: string;
  companyId: string;
  items: Requirement[];
  userId: string | null;
}): Promise<RequirementRow[]> {
  const seen = new Set<string>();
  const items = opts.items.filter((r) => {
    const key = `${r.kind}|${r.code.toLowerCase()}|${(r.level ?? "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const { error: delError } = await supabaseAdmin
    .from("competence_requirements")
    .delete()
    .eq("subject_type", opts.subjectType)
    .eq("subject_id", opts.subjectId);
  if (delError) throw new Error(`saveRequirements delete: ${delError.message}`);
  if (items.length) {
    const { error } = await supabaseAdmin.from("competence_requirements").insert(
      items.map((r) => ({
        company_id: opts.companyId,
        subject_type: opts.subjectType,
        subject_id: opts.subjectId,
        kind: r.kind,
        code: r.code,
        level: r.level ?? null,
        created_by: opts.userId,
      })),
    );
    if (error) throw new Error(`saveRequirements insert: ${error.message}`);
  }
  return loadRequirements(opts.subjectType, [opts.subjectId]);
}

export type SiteAccess = { siteId: string; siteName: string; siteCompanyId: string; companyIds: string[]; mainContractor: boolean };

/** The caller may look at this site: their company runs it or works on it, and site-scoped roles have it assigned. */
export async function resolveSiteAccess(
  siteId: string,
  auth: { uid: string | null; role: string | null; companyId: string | null },
): Promise<SiteAccess | null> {
  const { data: site } = await supabaseAdmin.from("sites").select("id, name, company_id").eq("id", siteId).maybeSingle();
  if (!site) return null;
  const siteCompanyId = String(site.company_id ?? "");
  const { data: subs } = await supabaseAdmin.from("site_subcontractors").select("company_id").eq("site_id", siteId);
  const companyIds = [...new Set([siteCompanyId, ...(subs ?? []).map((s) => String(s.company_id))].filter(Boolean))];
  const superuser = isPlatformSuperuser(auth.role);
  const own = (auth.companyId ?? "").trim();
  if (!superuser && !companyIds.includes(own)) return null;
  if (!superuser && usesAssignedSites(auth.role)) {
    if (!auth.uid) return null;
    const { data: assigned } = await supabaseAdmin
      .from("user_sites")
      .select("site_id")
      .eq("user_id", auth.uid)
      .eq("site_id", siteId)
      .limit(1);
    if (!assigned?.length) return null;
  }
  return {
    siteId,
    siteName: String(site.name ?? siteId),
    siteCompanyId,
    companyIds,
    mainContractor: superuser || own === siteCompanyId,
  };
}

export type MissingItem = {
  subjectType: SubjectType;
  subjectId: string;
  subjectTitle: string;
  requirement: string;
  detail: string;
};

export type MissingPerson = {
  userId: string;
  name: string;
  companyName: string;
  missing: MissingItem[];
  /** Requirements met only by a card no supervisor has checked yet. */
  unchecked: string[];
};

/**
 * People signed in at the site right now who are named on a RAMS (by acknowledging it) or
 * assigned to an open task there, and lack a card or ticket it lists. The main contractor
 * sees every company's RAMS and tasks; a subcontractor sees only its own.
 */
export async function missingCompetenceAtSite(access: SiteAccess, viewerCompanyId: string | null): Promise<{
  onSite: number;
  people: MissingPerson[];
}> {
  const onSite = await userIdsSignedInAtSite(access.siteId);
  if (!onSite.length) return { onSite: 0, people: [] };
  const onSiteSet = new Set(onSite);

  const companies = access.mainContractor ? access.companyIds : [(viewerCompanyId ?? "").trim()].filter(Boolean);
  if (!companies.length) return { onSite: onSite.length, people: [] };
  const { data: reqData, error: reqError } = await supabaseAdmin
    .from("competence_requirements")
    .select("id, company_id, subject_type, subject_id, kind, code, level")
    .in("company_id", companies);
  if (reqError) throw new Error(`missingCompetenceAtSite: ${reqError.message}`);
  const reqs = (reqData ?? []) as RequirementRow[];
  if (!reqs.length) return { onSite: onSite.length, people: [] };

  const ramsIds = [...new Set(reqs.filter((r) => r.subject_type === "rams").map((r) => r.subject_id))];
  const taskIds = [...new Set(reqs.filter((r) => r.subject_type === "task").map((r) => r.subject_id))];
  const subjects = new Map<string, { title: string; people: Set<string> }>();

  if (ramsIds.length) {
    const { data: rams } = await supabaseAdmin
      .from("rams")
      .select("id, title, site_id, site_wide, status, company_id")
      .in("id", ramsIds);
    const live = (rams ?? []).filter(
      (r) =>
        String(r.status ?? "").toUpperCase() !== "REJECTED" &&
        (String(r.site_id ?? "") === access.siteId || (r.site_wide === true && companies.includes(String(r.company_id)))),
    );
    if (live.length) {
      const { data: acks } = await supabaseAdmin
        .from("rams_acknowledgements")
        .select("rams_id, user_id")
        .in("rams_id", live.map((r) => String(r.id)))
        .in("user_id", onSite);
      for (const r of live) subjects.set(`rams:${r.id}`, { title: String(r.title ?? "RAMS"), people: new Set() });
      for (const a of acks ?? []) subjects.get(`rams:${a.rams_id}`)?.people.add(String(a.user_id));
    }
  }

  if (taskIds.length) {
    const { data: tasks } = await supabaseAdmin
      .from("tasks")
      .select("id, title, site_id, site_wide, status, company_id, assigned_to")
      .in("id", taskIds);
    const live = (tasks ?? []).filter(
      (t) =>
        !CLOSED_TASK_STATUSES.has(String(t.status ?? "").toUpperCase()) &&
        (String(t.site_id ?? "") === access.siteId || (t.site_wide === true && companies.includes(String(t.company_id)))),
    );
    if (live.length) {
      const { data: assigned } = await supabaseAdmin
        .from("task_assignments")
        .select("task_id, user_id")
        .in("task_id", live.map((t) => String(t.id)));
      for (const t of live) {
        const people = new Set<string>();
        if (t.assigned_to && onSiteSet.has(String(t.assigned_to))) people.add(String(t.assigned_to));
        subjects.set(`task:${t.id}`, { title: String(t.title ?? "Task"), people });
      }
      for (const a of assigned ?? []) {
        if (onSiteSet.has(String(a.user_id))) subjects.get(`task:${a.task_id}`)?.people.add(String(a.user_id));
      }
    }
  }

  const involved = [...new Set([...subjects.values()].flatMap((s) => [...s.people]))];
  if (!involved.length) return { onSite: onSite.length, people: [] };
  const holdings = await loadHoldings(involved);
  const today = new Date().toISOString().slice(0, 10);

  const byPerson = new Map<string, { missing: MissingItem[]; unchecked: Set<string> }>();
  for (const req of reqs) {
    const key = `${req.subject_type}:${req.subject_id}`;
    const subject = subjects.get(key);
    if (!subject) continue;
    for (const uid of subject.people) {
      const result = checkRequirement(req, holdings.get(uid) ?? { card: null, tickets: [] }, today);
      const entry = byPerson.get(uid) ?? { missing: [], unchecked: new Set<string>() };
      if (!result.ok) {
        entry.missing.push({
          subjectType: req.subject_type,
          subjectId: req.subject_id,
          subjectTitle: subject.title,
          requirement: requirementLabel(req),
          detail: result.detail,
        });
      } else if (result.unchecked) {
        entry.unchecked.add(requirementLabel(req));
      }
      byPerson.set(uid, entry);
    }
  }

  const flagged = [...byPerson.entries()].filter(([, e]) => e.missing.length || e.unchecked.size);
  if (!flagged.length) return { onSite: onSite.length, people: [] };
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email, company_id")
    .in("id", flagged.map(([uid]) => uid));
  const userMap = new Map((users ?? []).map((u) => [String(u.id), u]));
  const companyIdsForNames = [...new Set((users ?? []).map((u) => String(u.company_id ?? "")).filter(Boolean))];
  const { data: companyRows } = companyIdsForNames.length
    ? await supabaseAdmin.from("companies").select("id, name").in("id", companyIdsForNames)
    : { data: [] };
  const companyNames = new Map((companyRows ?? []).map((c) => [String(c.id), String(c.name ?? "")]));

  const people: MissingPerson[] = flagged.map(([uid, e]) => {
    const u = userMap.get(uid);
    return {
      userId: uid,
      name: String(u?.name ?? "").trim() || String(u?.email ?? "").trim() || "Unknown",
      companyName: companyNames.get(String(u?.company_id ?? "")) ?? "",
      missing: e.missing,
      unchecked: [...e.unchecked],
    };
  });
  people.sort((a, b) => b.missing.length - a.missing.length || a.name.localeCompare(b.name));
  return { onSite: onSite.length, people };
}

/** How many other accounts hold the same card number. */
export async function sharedCardCount(userId: string, cardNumber: string | null): Promise<number> {
  const wanted = normaliseCardNumber(cardNumber);
  if (!wanted) return 0;
  const raw = (cardNumber ?? "").trim();
  const variants = [...new Set([raw, wanted, raw.toLowerCase()])].filter(Boolean);
  const { data } = await supabaseAdmin
    .from("pre_induction_competency_card")
    .select("user_id, card_number")
    .in("card_number", variants)
    .neq("user_id", userId);
  return (data ?? []).filter((r) => normaliseCardNumber(r.card_number as string | null) === wanted).length;
}

export type CardReview = {
  card: HeldCard | null;
  checkedByName: string | null;
  flags: CardFlag[];
};

export async function cardReview(userId: string): Promise<CardReview> {
  const { data } = await supabaseAdmin
    .from("pre_induction_competency_card")
    .select("card_type, card_level, card_number, expiry, checked_at, checked_by")
    .eq("user_id", userId)
    .maybeSingle();
  const card = cardFromRow(data);
  let checkedByName: string | null = null;
  if (data?.checked_by) {
    const { data: who } = await supabaseAdmin.from("users").select("name, email").eq("id", data.checked_by).maybeSingle();
    checkedByName = String(who?.name ?? "").trim() || String(who?.email ?? "").trim() || null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const shared = await sharedCardCount(userId, card?.number ?? null);
  return { card, checkedByName, flags: cardFlags(card, today, shared) };
}
