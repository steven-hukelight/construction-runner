/**
 * Audit logging for GDPR and security compliance.
 * Logs verification actions, overrides, and sensitive data access.
 */

import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  | "clear_system_logs";

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
      user_id: entry.userId,
      action: entry.action,
      timestamp: entry.timestamp.toISOString(),
      actor_id: entry.actorId,
      actor_email: entry.actorEmail ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch (e) {
    console.error("Audit log write failed:", e);
  }
}
