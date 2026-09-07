import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

const DEFAULT_ITEMS = [
  { id: "ppe", label: "PPE worn correctly", done: false },
  { id: "hazards", label: "Work area checked for hazards", done: false },
  { id: "equipment", label: "Tools and equipment inspected", done: false },
  { id: "emergency", label: "Emergency exits / assembly point known", done: false },
];

/** GET — default template items + recent completions for company */
export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const companyId = auth.companyId;
    if (!companyId) {
      return NextResponse.json({ defaultItems: DEFAULT_ITEMS, recent: [] });
    }

    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 100);

    const { data, error } = await supabaseAdmin
      .from("safety_checklist_completions")
      .select("id, site_id, items, submitted_at, notes")
      .eq("company_id", companyId)
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("GET safety-checklist:", error);
      return NextResponse.json({ defaultItems: DEFAULT_ITEMS, recent: [] });
    }

    return NextResponse.json({
      defaultItems: DEFAULT_ITEMS,
      recent: data ?? [],
    });
  } catch (e) {
    console.error("GET safety-checklist:", e);
    return NextResponse.json({ defaultItems: DEFAULT_ITEMS, recent: [] });
  }
}

/** POST — submit a checklist */
export async function POST(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    const companyId = auth.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "Company required" }, { status: 400 });
    }
    if (!auth.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    const siteId = body.siteId ?? body.site_id ?? null;
    const notes = body.notes != null ? String(body.notes).trim() : null;

    const { data, error } = await supabaseAdmin
      .from("safety_checklist_completions")
      .insert({
        company_id: companyId,
        user_id: auth.uid,
        site_id: siteId ? String(siteId) : null,
        items,
        notes: notes || null,
      })
      .select("id, submitted_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ id: data?.id, submitted_at: data?.submitted_at }, { status: 201 });
  } catch (e) {
    console.error("POST safety-checklist:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
