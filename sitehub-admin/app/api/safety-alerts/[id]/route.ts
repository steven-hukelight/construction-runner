import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { sendPushToUsers } from "@/lib/onesignal";

function cid(x: { company_id?: string | null }): string | null {
  return (x.company_id ?? null) as string | null;
}

function severityBucket(raw: string | null | undefined): string {
  const value = (raw ?? "info").toLowerCase();
  if (value === "critical" || value === "high") return "critical";
  if (value === "warning" || value === "medium") return "warning";
  return "info";
}

async function canAccessAlert(req: Request, id: string): Promise<NextResponse | null> {
  const auth = await resolveMobileApiAuth(req);
  if (auth.isSuperuser) return null;

  const { data: doc } = await supabaseAdmin
    .from("safety_alerts")
    .select("*")
    .eq("id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!auth.companyId || cid(doc) !== auth.companyId)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await canAccessAlert(req, id);
  if (forbid) return forbid;
  const body = await req.json();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title != null) update.title = body.title;
  if (body.description != null) update.description = body.description;
  if (body.severity != null) update.severity = body.severity;
  if (body.expiresAt != null) update.expires_at = body.expiresAt ? new Date(body.expiresAt).toISOString() : null;

  const { data: updated, error } = await supabaseAdmin
    .from("safety_alerts")
    .update(update)
    .eq("id", id)
    .select("id, severity, title, company_id")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (updated && severityBucket(updated.severity) === "critical") {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("company_id", updated.company_id);
    const userIds = (users ?? [])
      .map((user) => user.id?.toString() ?? "")
      .filter(Boolean);
    if (userIds.length > 0) {
      sendPushToUsers(
        userIds,
        "Critical safety alert updated",
        updated.title ?? "Alert",
        {
          type: "safety_alert",
          alertId: updated.id,
          screen: "safety_alerts",
        },
      ).catch((pushError) =>
        console.error("Safety alert update push failed:", pushError),
      );
    }
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const forbid = await canAccessAlert(_req, id);
  if (forbid) return forbid;

  await supabaseAdmin.from("safety_alerts").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
