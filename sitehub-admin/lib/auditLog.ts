/**
 * Audit logging for GDPR and security compliance.
 * Logs verification actions, overrides, and sensitive data access.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `audit_logs.user_id` is UUID — invalid strings cause inserts to fail silently. */
function uuidOrNull(value: string | undefined | null): string | null {
  const s = (value ?? "").trim();
  if (!s || s === "unknown") return null;
  return UUID_RE.test(s) ? s : null;
}

/** True if value looks like a UUID (for resolving actor from `uid` cookie, etc.). */
export function isUuidLike(value: string | undefined | null): boolean {
  const s = (value ?? "").trim();
  return Boolean(s && UUID_RE.test(s));
}

export type AuditAction =
  | "verification_right_to_work"
  | "verification_medical"
  | "verification_certification"
  | "override_pre_induction"
  | "override_induction"
  | "reset_induction"
  | "sensitive_data_view"
  | "gdpr_export"
  | "gdpr_erasure"
  | "induction_complete"
  | "document_upload"
  | "rams_upload"
  | "rams_version_update"
  | "briefing_upload"
  | "clear_system_logs"
  | "rams_upload_failed";

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  timestamp: Date;
  actorId: string;
  actorEmail?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      user_id: uuidOrNull(entry.userId),
      action: entry.action,
      timestamp: entry.timestamp.toISOString(),
      actor_id: entry.actorId?.trim() || "unknown",
      actor_email: entry.actorEmail ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}
