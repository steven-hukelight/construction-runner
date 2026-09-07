import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export const dynamic = "force-dynamic";

/** Shorten UUIDs for display (first 8 chars + ellipsis). */
function shortId(id: string | undefined | null): string {
  if (!id) return "—";
  const s = String(id).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) {
    return `${s.slice(0, 8)}…`;
  }
  if (s.length > 16) return `${s.slice(0, 14)}…`;
  return s;
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  verification_right_to_work: "Right to work check",
  verification_medical: "Medical verification",
  verification_certification: "Certification verification",
  override_pre_induction: "Pre-induction override",
  override_induction: "Induction override",
  reset_induction: "Induction reset",
  sensitive_data_view: "Sensitive data viewed",
  gdpr_export: "Data export (GDPR)",
  gdpr_erasure: "Data erasure (GDPR)",
  induction_complete: "Induction completed",
  document_upload: "Document uploaded",
  rams_upload: "RAMS uploaded",
  rams_version_update: "RAMS version updated",
  briefing_upload: "Briefing uploaded",
  clear_system_logs: "System logs cleared",
  rams_upload_failed: "RAMS upload failed",
};

function humanizeAuditAction(action: string | undefined | null): string {
  const a = (action ?? "event").trim();
  if (AUDIT_ACTION_LABELS[a]) return AUDIT_ACTION_LABELS[a];
  return a
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatRegistrationStatus(raw: string | undefined): string {
  const t = (raw ?? "pending").trim();
  if (!t) return "Pending";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

/** Turn stored source keys into short labels for the activity feed. */
function displaySourceLabel(raw: string | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s || s === "system_logs" || s === "system") return "System";
  return s
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const ACTIVITY_ROLES = new Set(["superuser", "admin", "supervisor", "sub_admin"]);

/** Returns recent activity: full platform for superuser; company-scoped for admin/supervisor. */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const roleRaw = cookieStore.get("role")?.value ?? "";
    const roleLower = roleRaw.toLowerCase();
    if (!ACTIVITY_ROLES.has(roleLower)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const isSuperuser = roleLower === "superuser";
    let companyId: string | null = null;
    if (!isSuperuser) {
      companyId = await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role: roleRaw,
      });
      if (!companyId?.trim()) {
        return NextResponse.json({ error: "Company context required" }, { status: 400 });
      }
    }

    let companyUserIds: string[] = [];
    if (!isSuperuser && companyId) {
      const { data: companyUsers } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("company_id", companyId.trim());
      companyUserIds = (companyUsers ?? [])
        .map((u) => String((u as { id?: string }).id ?? "").trim())
        .filter(Boolean);
    }

    const logs: { id: string; time: string; level: string; message: string; source?: string }[] = [];

    try {
      const auditLimit = isSuperuser ? 30 : 100;
      let rows: Record<string, unknown>[] = [];
      if (isSuperuser) {
        const { data: audit } = await supabaseAdmin
          .from("audit_logs")
          .select("id, action, user_id, actor_id, actor_email, timestamp, metadata")
          .order("timestamp", { ascending: false })
          .limit(auditLimit);
        rows = (audit ?? []) as Record<string, unknown>[];
      } else if (companyId?.trim()) {
        const cid = companyId.trim();
        const orParts: string[] = [];
        if (companyUserIds.length) {
          orParts.push(`user_id.in.(${companyUserIds.join(",")})`);
          orParts.push(`actor_id.in.(${companyUserIds.join(",")})`);
        }
        orParts.push(`metadata->>companyId.eq.${cid}`);
        const { data: audit, error: auditErr } = await supabaseAdmin
          .from("audit_logs")
          .select("id, action, user_id, actor_id, actor_email, timestamp, metadata")
          .or(orParts.join(","))
          .order("timestamp", { ascending: false })
          .limit(auditLimit);
        if (auditErr) {
          console.error("audit_logs company scope:", auditErr.message);
          const idSet = new Set(companyUserIds);
          const { data: recent } = await supabaseAdmin
            .from("audit_logs")
            .select("id, action, user_id, actor_id, actor_email, timestamp, metadata")
            .order("timestamp", { ascending: false })
            .limit(400);
          rows = ((recent ?? []) as Record<string, unknown>[]).filter((row) => {
            const r = row as {
              user_id?: string | null;
              actor_id?: string | null;
              metadata?: Record<string, unknown> | null;
            };
            const uid = r.user_id ? String(r.user_id) : "";
            const aid = r.actor_id ? String(r.actor_id).trim() : "";
            if ((uid && idSet.has(uid)) || (aid && idSet.has(aid))) return true;
            const mc = (r.metadata ?? {}) as Record<string, unknown>;
            const c = mc.companyId ?? mc.company_id;
            return typeof c === "string" && c.trim() === cid;
          });
          rows = rows.slice(0, auditLimit);
        } else {
          rows = (audit ?? []) as Record<string, unknown>[];
        }
      }
      rows.slice(0, 30).forEach((row) => {
        const r = row as {
          id: string;
          action?: string;
          user_id?: string;
          actor_id?: string;
          actor_email?: string | null;
          timestamp?: string;
          metadata?: Record<string, unknown> | null;
        };
        const actor =
          (r.actor_email && String(r.actor_email).includes("@") ? r.actor_email : null) ?? shortId(r.actor_id);
        const errHint =
          r.action === "rams_upload_failed" && r.metadata && typeof r.metadata.error === "string"
            ? ` · ${String(r.metadata.error).slice(0, 120)}${String(r.metadata.error).length > 120 ? "…" : ""}`
            : "";
        const msg = `${humanizeAuditAction(r.action)} · user ${shortId(r.user_id)} · by ${actor}${errHint}`;
        const level =
          r.action === "rams_upload_failed" || r.action === "clear_system_logs" ? "error" : "info";
        logs.push({
          id: `audit-${row.id}`,
          time: typeof row.timestamp === "string" ? row.timestamp : new Date().toISOString(),
          level,
          message: msg,
          source: "Audit",
        });
      });
    } catch {
      // ignore
    }

    if (isSuperuser) {
      try {
        const { data: authLogs } = await supabaseAdmin
          .from("auth_logs")
          .select("id, user_id, email_attempted, outcome, created_at")
          .order("created_at", { ascending: false })
          .limit(30);
        (authLogs ?? []).forEach((row) => {
          const r = row as { id: string; user_id?: string; email_attempted?: string; outcome?: string; created_at?: string };
          const email = r.email_attempted ?? "unknown email";
          let headline = "Sign-in";
          if (r.outcome === "success") headline = "Signed in";
          else if (r.outcome === "blocked") headline = "Sign-in blocked";
          else headline = "Sign-in failed";
          const msg = `${headline} · ${email}`;
          logs.push({
            id: `auth-${r.id}`,
            time: typeof r.created_at === "string" ? r.created_at : new Date().toISOString(),
            level: r.outcome === "success" ? "info" : r.outcome === "blocked" ? "warn" : "error",
            message: msg,
            source: "Auth",
          });
        });
      } catch {
        // auth_logs table may not exist
      }
    }

    if (isSuperuser) {
      try {
        const { data: sysLogs } = await supabaseAdmin
        .from("system_logs")
        .select("id, level, message, source, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
        (sysLogs ?? []).forEach((row) => {
          logs.push({
            id: `sys-${(row as { id: string }).id}`,
            time: typeof (row as { created_at?: string }).created_at === "string"
              ? (row as { created_at: string }).created_at
              : new Date().toISOString(),
            level: ((row as { level?: string }).level ?? "info").toLowerCase(),
            message: (row as { message: string }).message ?? "",
            source: displaySourceLabel((row as { source?: string }).source),
          });
        });
      } catch {
        // ignore
      }
    }

    try {
      let regsQuery = supabaseAdmin.from("registrations").select("id, data, created_at");
      if (!isSuperuser && companyId) {
        regsQuery = regsQuery.eq("company_id", companyId.trim());
      }
      const { data: regs } = await regsQuery.order("created_at", { ascending: false }).limit(20);
      (regs ?? []).forEach((row) => {
        const d = (row.data ?? {}) as { email?: string; status?: string };
        logs.push({
          id: `reg-${row.id}`,
          time: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
          level: "info",
          message: `Registration · ${d.email ?? "unknown"} · ${formatRegistrationStatus(d.status)}`,
          source: "Registration",
        });
      });
    } catch {
      // ignore
    }

    logs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return NextResponse.json(logs.slice(0, 50));
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /api/maintenance/activity-log failed:", message);
    return NextResponse.json([], { status: 200 });
  }
}
