import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    let companyId = cookieStore.get("companyId")?.value?.trim();

    if (!companyId && role !== "superuser") {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || "";
    }

    const { data: assigns, error: aErr } = await supabaseAdmin
      .from("asset_assignments")
      .select("id, user_id, assigned_at")
      .eq("asset_id", id)
      .order("assigned_at", { ascending: false });

    if (aErr) {
      return NextResponse.json([], { status: 200 });
    }

    const userIds = [...new Set((assigns ?? []).map((a) => a.user_id))];
    const users: Record<string, { email?: string; display_name?: string }> = {};
    if (userIds.length > 0) {
      const { data: uData } = await supabaseAdmin
        .from("users")
        .select("id, email")
        .in("id", userIds);
      const { data: pData } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);

      (uData ?? []).forEach((u) => { users[u.id] = { ...users[u.id], email: u.email }; });
      (pData ?? []).forEach((p) => { users[p.id] = { ...users[p.id], display_name: p.display_name }; });
    }

    const result = (assigns ?? []).map((a) => ({
      ...a,
      user: users[a.user_id] ?? {},
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/assets/[id]/assignments:", e);
    return NextResponse.json([], { status: 200 });
  }
}
