import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { canApproveRegistrations } from "@/lib/signupRegistration";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!canApproveRegistrations(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { data } = await supabaseAdmin.from("registrations").select("id, company_id, data").eq("id", id).maybeSingle();
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const roleLower = (auth.role ?? "").toLowerCase();
    if (!auth.isSuperuser && roleLower !== "superuser") {
      const rowCid = data.company_id ? String(data.company_id).trim() : "";
      if (!auth.companyId || rowCid !== auth.companyId.trim()) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const merged = { ...((data.data as Record<string, unknown>) ?? {}), status: "REJECTED", rejectedAt: new Date().toISOString() };
    await supabaseAdmin.from("registrations").update({ data: merged }).eq("id", id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
