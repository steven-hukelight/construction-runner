import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendPushToUsers } from "@/lib/onesignal";
import { sendPlainEmail } from "@/lib/sendPlainEmail";
import { getServerPublicOrigin } from "@/lib/url";
import { assignedActiveUserIds, inductedUserIdSet } from "@/lib/hsDocumentAudience";
import { loadAcknowledgementPeople } from "@/lib/acknowledgementPeople";
import {
  applyRemindCooldown,
  capRecipients,
  splitByInduction,
  unsignedUserIds,
} from "@/lib/documentReminderEligibility";

export type DocumentKind = "briefing" | "rams";

export type OutstandingPerson = {
  userId: string;
  name: string;
  role: string;
  lastRemindedAt: string | null;
  inducted: boolean;
};

export type DocumentRemindResult = {
  reminded: number;
  skippedRecent: number;
  skippedInduction: number;
  skippedSigned: number;
  skippedCap: number;
  lastRemindedAt: string | null;
  pushSent: boolean;
  pushError: string | null;
  emailed: number;
  emailFailed: number;
};

export async function latestReminderByDocument(
  kind: DocumentKind,
  documentIds: string[],
  companyId: string
): Promise<Record<string, string>> {
  const ids = [...new Set(documentIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from("document_reminders")
    .select("document_id, sent_at")
    .eq("company_id", companyId)
    .eq("document_kind", kind)
    .in("document_id", ids)
    .order("sent_at", { ascending: false });
  if (error) {
    console.warn("[document-remind] latest by document failed:", error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    const did = String((row as { document_id?: string }).document_id ?? "");
    const sent = String((row as { sent_at?: string }).sent_at ?? "");
    if (did && sent && !out[did]) out[did] = sent;
  }
  return out;
}

export async function latestReminderByUser(
  kind: DocumentKind,
  documentId: string,
  userIds: string[]
): Promise<Record<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const { data, error } = await supabaseAdmin
    .from("document_reminders")
    .select("user_id, sent_at")
    .eq("document_kind", kind)
    .eq("document_id", documentId)
    .in("user_id", ids)
    .order("sent_at", { ascending: false });
  if (error) {
    console.warn("[document-remind] latest by user failed:", error.message);
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    const uid = String((row as { user_id?: string }).user_id ?? "");
    const sent = String((row as { sent_at?: string }).sent_at ?? "");
    if (uid && sent && !out[uid]) out[uid] = sent;
  }
  return out;
}

export async function loadOutstandingPeople(opts: {
  kind: DocumentKind;
  documentId: string;
  companyId: string;
  siteId: string | null;
  acknowledgedUserIds: string[];
  requireInduction: boolean;
}): Promise<OutstandingPerson[]> {
  const assigned = await assignedActiveUserIds(opts.companyId, opts.siteId);
  const unsigned = unsignedUserIds(assigned, opts.acknowledgedUserIds);
  if (unsigned.length === 0) return [];

  const inducted = opts.requireInduction
    ? await inductedUserIdSet(unsigned, opts.siteId)
    : new Set(unsigned);
  const lastReminded = await latestReminderByUser(opts.kind, opts.documentId, unsigned);
  const people = await loadAcknowledgementPeople(unsigned);

  return unsigned.map((userId) => {
    const person = people.get(userId);
    return {
      userId,
      name: person?.name ?? "Unnamed user",
      role: person?.role ?? "—",
      lastRemindedAt: lastReminded[userId] ?? null,
      inducted: inducted.has(userId),
    };
  });
}

export async function sendDocumentReminders(opts: {
  kind: DocumentKind;
  documentId: string;
  companyId: string;
  siteId: string | null;
  title: string;
  acknowledgedUserIds: string[];
  requireInduction: boolean;
  actorId: string | null;
}): Promise<DocumentRemindResult> {
  const assigned = await assignedActiveUserIds(opts.companyId, opts.siteId);
  const unsigned = unsignedUserIds(assigned, opts.acknowledgedUserIds);
  const skippedSigned = Math.max(0, assigned.length - unsigned.length);

  const inducted = opts.requireInduction
    ? await inductedUserIdSet(unsigned, opts.siteId)
    : new Set(unsigned);
  const afterInduction = opts.requireInduction
    ? splitByInduction(unsigned, inducted)
    : { eligible: unsigned, skippedInduction: [] as string[] };

  const lastReminded = await latestReminderByUser(opts.kind, opts.documentId, afterInduction.eligible);
  const afterCooldown = applyRemindCooldown(afterInduction.eligible, lastReminded);
  const { take, skippedCap } = capRecipients(afterCooldown.sendable);

  if (take.length === 0) {
    return {
      reminded: 0,
      skippedRecent: afterCooldown.skippedRecent.length,
      skippedInduction: afterInduction.skippedInduction.length,
      skippedSigned,
      skippedCap,
      lastRemindedAt: latestOf(Object.values(lastReminded)),
      pushSent: false,
      pushError: null,
      emailed: 0,
      emailFailed: 0,
    };
  }

  const copy = remindCopy(opts.kind, opts.title);
  const pushData: Record<string, string> =
    opts.kind === "briefing"
      ? { type: "briefing_reminder", screen: "briefings", briefingId: opts.documentId }
      : { type: "rams_reminder", screen: "rams", ramsId: opts.documentId };

  const push = await sendPushToUsers(take, copy.title, copy.body, pushData);

  const { data: users } = await supabaseAdmin
    .from("users")
    .select("id, email, display_name, name")
    .in("id", take);

  const origin = getServerPublicOrigin();
  let emailed = 0;
  let emailFailed = 0;
  for (const u of users ?? []) {
    const email = String((u as { email?: string }).email ?? "").trim();
    if (!email) continue;
    const name =
      String((u as { display_name?: string }).display_name ?? (u as { name?: string }).name ?? "").trim() ||
      email.split("@")[0];
    const text = [
      `Hi ${name},`,
      "",
      copy.emailLine,
      "Please open Construction Runner and acknowledge it when you can.",
      "",
      origin ? `Web: ${origin}/dashboard/health-and-safety/${opts.kind === "briefing" ? "briefings" : "rams"}` : "",
      "",
      "Thanks,",
      "Construction Runner",
    ]
      .filter(Boolean)
      .join("\n");
    const result = await sendPlainEmail(email, copy.emailSubject, text);
    if (result.ok) emailed += 1;
    else if (result.error !== "not_configured") emailFailed += 1;
  }

  const sentAt = new Date().toISOString();
  const rows = take.map((userId) => ({
    company_id: opts.companyId,
    document_kind: opts.kind,
    document_id: opts.documentId,
    user_id: userId,
    sent_at: sentAt,
    sent_by: opts.actorId,
  }));
  const { error: insertErr } = await supabaseAdmin.from("document_reminders").insert(rows);
  if (insertErr) {
    console.warn("[document-remind] log insert failed:", insertErr.message);
  }

  const notifications = take.map((userId) => ({
    user_id: userId,
    topic: opts.kind === "briefing" ? "briefings" : "rams",
    type: opts.kind === "briefing" ? "briefing_reminder" : "rams_reminder",
    title: copy.title,
    body: copy.body,
    data: pushData,
    sent_at: sentAt,
    push_dispatched_at: push.sent ? sentAt : null,
  }));
  const { error: notifErr } = await supabaseAdmin.from("notifications").insert(notifications);
  if (notifErr) {
    console.warn("[document-remind] notification insert failed:", notifErr.message);
  }

  return {
    reminded: take.length,
    skippedRecent: afterCooldown.skippedRecent.length,
    skippedInduction: afterInduction.skippedInduction.length,
    skippedSigned,
    skippedCap,
    lastRemindedAt: sentAt,
    pushSent: Boolean(push.sent),
    pushError: push.error ?? null,
    emailed,
    emailFailed,
  };
}

function latestOf(values: string[]): string | null {
  let latest: string | null = null;
  let latestT = 0;
  for (const raw of values) {
    const t = new Date(raw).getTime();
    if (Number.isFinite(t) && t > latestT) {
      latestT = t;
      latest = raw;
    }
  }
  return latest;
}

function remindCopy(kind: DocumentKind, title: string): {
  title: string;
  body: string;
  emailSubject: string;
  emailLine: string;
} {
  const label = title.trim() || (kind === "briefing" ? "this briefing" : "this RAMS");
  if (kind === "briefing") {
    return {
      title: `Please acknowledge: ${label}`,
      body: "Your supervisor asked you to acknowledge this briefing.",
      emailSubject: `Action needed: acknowledge ${label}`,
      emailLine: `Please acknowledge the briefing “${label}”.`,
    };
  }
  return {
    title: `Please acknowledge: ${label}`,
    body: "Your supervisor asked you to acknowledge this RAMS document.",
    emailSubject: `Action needed: acknowledge ${label}`,
    emailLine: `Please acknowledge the RAMS document “${label}”.`,
  };
}
