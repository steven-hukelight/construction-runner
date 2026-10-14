import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canApproveRegistrations } from "@/lib/signupRegistration";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await resolveMobileApiAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!canApproveRegistrations(auth.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: regId } = await params;

  const { data: reg } = await supabaseAdmin.from("registrations").select("id, data").eq("id", regId).maybeSingle();
  if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

  const merged = { ...((reg.data as Record<string, unknown>) ?? {}), status: "REJECTED", rejected_at: new Date().toISOString() };
  await supabaseAdmin.from("registrations").update({ data: merged }).eq("id", regId);
  return NextResponse.json({ success: true });
}
