import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

export async function GET(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (!auth.uid) {
    return NextResponse.json({ ids: [] }, { status: 200 });
  }

  const { data, error } = await supabaseAdmin
    .from("site_rule_favourites")
    .select("site_rule_id")
    .eq("user_id", auth.uid);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ids: (data ?? [])
      .map((row) => row.site_rule_id?.toString() ?? "")
      .filter(Boolean),
  });
}

export async function POST(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (!auth.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ruleId = typeof body.ruleId === "string" ? body.ruleId.trim() : "";
  if (!ruleId) {
    return NextResponse.json({ error: "ruleId required" }, { status: 400 });
  }

  const { data: rule } = await supabaseAdmin
    .from("site_rules")
    .select("id, company_id")
    .eq("id", ruleId)
    .maybeSingle();
  if (!rule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!auth.isSuperuser && auth.companyId && rule.company_id !== auth.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("site_rule_favourites")
    .upsert(
      {
        user_id: auth.uid,
        site_rule_id: ruleId,
      },
      { onConflict: "user_id,site_rule_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const auth = await resolveMobileApiAuth(req);
  if (!auth.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const ruleId = url.searchParams.get("ruleId")?.trim();
  if (!ruleId) {
    return NextResponse.json({ error: "ruleId required" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("site_rule_favourites")
    .delete()
    .eq("user_id", auth.uid)
    .eq("site_rule_id", ruleId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
