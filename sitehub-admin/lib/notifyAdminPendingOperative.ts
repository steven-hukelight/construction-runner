import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hasEmailTransportConfigured, sendPlainEmail } from "@/lib/sendPlainEmail";

const GLOBAL_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

/** Default inbox for product/ops visibility on pending operative signups. Override with OPS_NOTIFICATION_EMAIL; set to empty string to disable. */
export function getOpsPendingApprovalInbox(): string | null {
  const raw = process.env.OPS_NOTIFICATION_EMAIL;
  if (raw === "") return null;
  const t = (raw ?? "info@construction-runner.com").trim();
  return t.includes("@") ? t : null;
}

function userWantsPendingApprovalEmail(prefs: unknown): boolean {
  if (prefs == null || typeof prefs !== "object") return true;
  const o = prefs as Record<string, unknown>;
  if (o.operativePendingApproval === false) return false;
  return true;
}

/** Notify company admins/supervisors when an operative registers and awaits approval. */
export async function notifyAdminsOperativePendingSignup(params: {
  companyId: string;
  companyName: string | null;
  operativeName: string | null;
  operativeEmail: string;
  registrationId: string;
}): Promise<void> {
  if (!hasEmailTransportConfigured()) {
    console.warn("notifyAdminsOperativePendingSignup: no email transport (RESEND/SendGrid/SMTP)");
    return;
  }

  const { data: settingsRow } = await supabaseAdmin
    .from("settings")
    .select("config")
    .eq("id", GLOBAL_SETTINGS_ID)
    .maybeSingle();
  const cfg = (settingsRow?.config as Record<string, unknown>) ?? {};
  const emailNotifications = (cfg.emailNotifications as Record<string, unknown>) ?? {};
  if (emailNotifications.operativePendingApproval === false) return;

  const { data: admins } = await supabaseAdmin
    .from("users")
    .select("email, role, email_notification_preferences")
    .eq("company_id", params.companyId)
    .in("role", ["admin", "supervisor", "sub_admin"]);

  const emails = new Set<string>();
  for (const row of admins ?? []) {
    const r = row as { email?: string; email_notification_preferences?: unknown };
    if (!userWantsPendingApprovalEmail(r.email_notification_preferences)) continue;
    const e = r.email?.trim();
    if (e && e.includes("@")) emails.add(e);
  }

  const opsInbox = getOpsPendingApprovalInbox();
  if (opsInbox) emails.add(opsInbox);

  if (emails.size === 0) return;

  const companyLabel = params.companyName?.trim() || params.companyId;
  const nameLabel = params.operativeName?.trim() || params.operativeEmail;
  const subject = `New operative pending approval — ${companyLabel}`;
  const text = [
    `A new operative has registered and is waiting for approval.`,
    ``,
    `Company: ${companyLabel}`,
    `Name: ${nameLabel}`,
    `Email: ${params.operativeEmail}`,
    `Registration ID: ${params.registrationId}`,
    ``,
    `Open the admin dashboard → Users / Registrations to approve or reject.`,
  ].join("\n");

  for (const to of emails) {
    const { ok } = await sendPlainEmail(to, subject, text);
    if (!ok) console.warn("notifyAdminsOperativePendingSignup: failed to send to", to);
  }
}
