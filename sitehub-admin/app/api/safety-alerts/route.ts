import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { sendPushToUsers } from "@/lib/onesignal";

function severityBucket(raw: string | null | undefined): string {
  const value = (raw ?? "info").toLowerCase();
  if (value === "critical" || value === "high") return "critical";
  if (value === "warning" || value === "medium") return "warning";
  return "info";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const auth = await resolveMobileApiAuth(req);
    const countOnly = url.searchParams.get("count");
    const severity = url.searchParams.get("severity");
    const sort = url.searchParams.get("sort") || "newest";
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    let query = supabaseAdmin.from("safety_alerts").select("*");
    if (auth.companyId) query = query.eq("company_id", auth.companyId);
    if (severity) query = query.in("severity", severity === "critical" ? ["critical", "high"] : severity === "warning" ? ["warning", "medium"] : ["info", "low"]);
    if (dateFrom) query = query.gte("created_at", dateFrom);
    if (dateTo) query = query.lte("created_at", dateTo);

    if (sort === "expiry") {
      query = query.order("expires_at", { ascending: true, nullsFirst: false });
    } else if (sort === "severity") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (error) {
      console.error("GET /api/safety-alerts:", error);
      return NextResponse.json([]);
    }

    const alerts = data ?? [];
    const alertIds = alerts.map((alert) => alert.id);
    let acknowledgedIds = new Set<string>();

    if (auth.uid && alertIds.length > 0) {
      const { data: acknowledgements } = await supabaseAdmin
        .from("alert_acknowledgements")
        .select("alert_id")
        .eq("user_id", auth.uid)
        .in("alert_id", alertIds);
      acknowledgedIds = new Set(
        (acknowledgements ?? [])
          .map((row) => row.alert_id?.toString() ?? "")
          .filter(Boolean),
      );
    }

    if (countOnly === "unread") {
      const unreadCount = alerts.filter((alert) => {
        if (!auth.uid) return true;
        return !acknowledgedIds.has(alert.id);
      }).length;
      return NextResponse.json({ count: unreadCount });
    }

    const enriched = alerts.map((alert) => {
      const severityValue = severityBucket(alert.severity);
      return {
        id: alert.id,
        ...alert,
        severity_bucket: severityValue,
        acknowledged: auth.uid ? acknowledgedIds.has(alert.id) : false,
        unread: auth.uid ? !acknowledgedIds.has(alert.id) : false,
      };
    });

    if (sort === "severity") {
      enriched.sort((a, b) => {
        const rank = (value: string) =>
          value === "critical" ? 3 : value === "warning" ? 2 : 1;
        const severityCompare =
          rank(b.severity_bucket) - rank(a.severity_bucket);
        if (severityCompare != 0) return severityCompare;
        return String(b.created_at ?? "").localeCompare(
          String(a.created_at ?? ""),
        );
      });
    }

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("GET /api/safety-alerts:", e);
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const auth = await resolveMobileApiAuth(req);
  const companyId = auth.companyId;
  if (!companyId)
    return NextResponse.json({ error: "Company required" }, { status: 400 });

  const { title, description, severity } = body;
  const { data, error } = await supabaseAdmin
    .from("safety_alerts")
    .insert({
      title: title || "Alert",
      description: description || "",
      severity: severity || "info",
      company_id: companyId,
      site_id: body.siteId || null,
      expires_at: body.expiresAt ? new Date(body.expiresAt).toISOString() : null,
    })
    .select("id, severity, title, company_id")
    .single();

  if (error) {
    console.error("POST /api/safety-alerts failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data && severityBucket(data.severity) == "critical") {
    const { data: users } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("company_id", data.company_id);
    const userIds = (users ?? [])
      .map((user) => user.id?.toString() ?? "")
      .filter(Boolean);
    if (userIds.length > 0) {
      sendPushToUsers(userIds, "Critical safety alert", data.title ?? "Alert", {
        type: "safety_alert",
        alertId: data.id,
        screen: "safety_alerts",
      }).catch((pushError) =>
        console.error("Safety alert push failed:", pushError),
      );
    }
  }
  return NextResponse.json({ id: data?.id });
}
