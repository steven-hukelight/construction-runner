import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Sync display_name, phone from profiles to users. Superuser only. */
export async function POST(req: Request) {
  try {
    const role = (await cookies()).get("role")?.value;
    if (role !== "superuser") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const companyIdFilter = body.companyId?.trim() || null;

    const { data: users } = companyIdFilter
      ? await supabaseAdmin.from("users").select("id, display_name, phone").eq("company_id", companyIdFilter)
      : await supabaseAdmin.from("users").select("id, display_name, phone");

    let synced = 0;
    let skipped = 0;

    for (const user of users ?? []) {
      const { data: profile } = await supabaseAdmin.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
      if (!profile) {
        skipped++;
        continue;
      }
      const updates: Record<string, string> = {};
      const pd = profile as Record<string, unknown>;
      const displayName = (pd.display_name ?? pd.displayName ?? "") as string;
      const phone = (pd.phone ?? "") as string;
      if (displayName && displayName !== (user.display_name ?? "")) updates.display_name = displayName;
      if (phone && phone !== (user.phone ?? "")) updates.phone = phone;
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("users").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", user.id);
        synced++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${synced} user(s), skipped ${skipped} (no changes or no profile).`,
      synced,
      skipped,
    });
  } catch (e) {
    console.error("sync-profile-to-user failed:", e);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
