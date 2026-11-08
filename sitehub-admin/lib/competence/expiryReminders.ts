import { sendPushToUsers } from "@/lib/onesignal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { companyStaffIds } from "@/lib/training/service";
import { ticketsFromPreInduction } from "@/lib/competence/service";
import { LAPSE_NOTICE_WINDOW_DAYS, expiryStage, normaliseCode, ticketLabel, type ExpiryStage } from "@/lib/competence/rules";

type ExpiringItem = {
  userId: string;
  /** Stable per card or certificate, so a renewal with a new date starts its reminders again. */
  itemKey: string;
  label: string;
  expiry: string;
  stage: ExpiryStage;
};

const NOTIFICATION_TYPE = "competence_expiry";

function windowBounds(now: Date): { from: string; to: string; today: string } {
  const today = now.toISOString().slice(0, 10);
  const from = new Date(now);
  from.setUTCDate(from.getUTCDate() - LAPSE_NOTICE_WINDOW_DAYS);
  const to = new Date(now);
  to.setUTCDate(to.getUTCDate() + 61);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), today };
}

async function expiringItems(now: Date): Promise<ExpiringItem[]> {
  const { from, to, today } = windowBounds(now);
  const items: ExpiringItem[] = [];
  const push = (userId: string, itemKey: string, label: string, expiry: string | null) => {
    const day = expiry ? String(expiry).slice(0, 10) : "";
    const stage = expiryStage(day || null, today);
    if (stage) items.push({ userId, itemKey, label, expiry: day, stage });
  };

  const [cards, certs, preCerts] = await Promise.all([
    supabaseAdmin
      .from("pre_induction_competency_card")
      .select("user_id, card_type, expiry")
      .gte("expiry", from)
      .lte("expiry", to)
      .limit(5000),
    supabaseAdmin
      .from("certifications")
      .select("id, user_id, type, title, expires_at")
      .gte("expires_at", from)
      .lte("expires_at", to)
      .limit(5000),
    supabaseAdmin.from("pre_induction_certifications").select("user_id, certifications, data").limit(5000),
  ]);
  if (cards.error) throw new Error(`competence expiry cards: ${cards.error.message}`);

  for (const c of cards.data ?? []) {
    push(String(c.user_id), "card", `${String(c.card_type ?? "").trim() || "competency"} card`, c.expiry as string | null);
  }
  for (const c of certs.data ?? []) {
    const name = String(c.title || c.type || "").trim();
    if (name) push(String(c.user_id), `cert:${c.id}`, ticketLabel(name), c.expires_at as string | null);
  }
  for (const row of preCerts.data ?? []) {
    for (const t of ticketsFromPreInduction(row)) {
      push(String(row.user_id), `picert:${normaliseCode(t.code)}`, t.label, t.expiry);
    }
  }
  return items;
}

function ownMessage(item: ExpiringItem): { title: string; body: string } {
  if (item.stage === "expired") {
    return {
      title: `${item.label} expired`,
      body: `Your ${item.label} expired on ${item.expiry}. Renew it, then update it in My Info.`,
    };
  }
  return {
    title: `${item.label} expires soon`,
    body: `Your ${item.label} expires on ${item.expiry}. Renew it before then and update it in My Info.`,
  };
}

/**
 * Daily push to workers at 60, 30 and 7 days before a card or certificate expires, and once
 * when it lapses. On lapse their company's supervisors and admins are told too. Deduped per
 * person, item, expiry date and stage via `notifications` rows.
 */
export async function dispatchCompetenceExpiryReminders(limit = 200): Promise<{
  scanned: number;
  notified: number;
  skipped: number;
  errors: number;
}> {
  let items: ExpiringItem[];
  try {
    items = await expiringItems(new Date());
  } catch (e) {
    console.error("[competence-expiry] query failed:", e instanceof Error ? e.message : e);
    return { scanned: 0, notified: 0, skipped: 0, errors: 1 };
  }
  if (!items.length) return { scanned: 0, notified: 0, skipped: 0, errors: 0 };

  const userIds = [...new Set(items.map((i) => i.userId))];
  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, name, email, company_id, approved")
    .in("id", userIds);
  const userMap = new Map((users ?? []).map((u) => [String(u.id), u]));
  const staffByCompany = new Map<string, string[]>();

  let notified = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of items) {
    if (notified >= limit) break;
    const user = userMap.get(item.userId);
    if (!user || user.approved === false) {
      skipped += 1;
      continue;
    }
    const own = ownMessage(item);
    if (await markOnce(item, item.userId, own.title, own.body)) {
      const res = await sendPushToUsers([item.userId], own.title, own.body, {
        type: NOTIFICATION_TYPE,
        screen: "my_info",
        item: item.itemKey,
        stage: item.stage,
      });
      if (res.sent) notified += 1;
      else errors += 1;
    } else {
      skipped += 1;
    }

    const companyId = String(user.company_id ?? "");
    if (item.stage !== "expired" || !companyId) continue;
    if (!staffByCompany.has(companyId)) staffByCompany.set(companyId, await companyStaffIds(companyId));
    const staff = (staffByCompany.get(companyId) ?? []).filter((id) => id !== item.userId);
    if (!staff.length) continue;
    const name = String(user.name ?? "").trim() || String(user.email ?? "").trim() || "An operative";
    const title = `${item.label} expired`;
    const body = `${name}'s ${item.label} expired on ${item.expiry}.`;
    const fresh: string[] = [];
    for (const uid of staff) {
      if (await markOnce(item, uid, title, body)) fresh.push(uid);
    }
    if (!fresh.length) continue;
    const res = await sendPushToUsers(fresh, title, body, {
      type: NOTIFICATION_TYPE,
      item: item.itemKey,
      stage: item.stage,
      subject_user_id: item.userId,
    });
    if (res.sent) notified += fresh.length;
    else errors += 1;
  }

  return { scanned: items.length, notified, skipped, errors };
}

async function markOnce(item: ExpiringItem, userId: string, title: string, body: string): Promise<boolean> {
  const { data: existing } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", NOTIFICATION_TYPE)
    .filter("data->>subject_user_id", "eq", item.userId)
    .filter("data->>item", "eq", item.itemKey)
    .filter("data->>expiry", "eq", item.expiry)
    .filter("data->>stage", "eq", item.stage)
    .limit(1);
  if (existing && existing.length > 0) return false;

  const nowIso = new Date().toISOString();
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    topic: "competence",
    type: NOTIFICATION_TYPE,
    title,
    body,
    data: {
      type: NOTIFICATION_TYPE,
      item: item.itemKey,
      expiry: item.expiry,
      stage: item.stage,
      subject_user_id: item.userId,
    },
    sent_at: nowIso,
    push_dispatched_at: nowIso,
  });
  if (error) {
    if ((error as { code?: string }).code === "23505") return false;
    console.warn("[competence-expiry] marker insert failed:", error.message);
  }
  return true;
}
