import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await resolveMobileApiAuth(req);
  if (!auth.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: alert } = await supabaseAdmin
    .from("safety_alerts")
    .select("id, company_id")
    .eq("id", id)
    .maybeSingle();

  if (!alert) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!auth.isSuperuser && auth.companyId && alert.company_id !== auth.companyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("alert_acknowledgements")
    .upsert(
      {
        user_id: auth.uid,
        alert_id: id,
        acknowledged_at: new Date().toISOString(),
      },
      { onConflict: "user_id,alert_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
