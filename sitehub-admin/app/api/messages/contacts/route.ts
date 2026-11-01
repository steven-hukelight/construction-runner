import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";
import { isMessagingStaffRole, messageableUserIds } from "@/lib/messages/siteThread";

function personLabel(u: {
  name?: string | null;
  display_name?: string | null;
  email?: string | null;
}): string {
  const raw = [u.name, u.display_name, u.email?.split("@")[0]].find((s) => s && String(s).trim());
  return String(raw ?? "Unknown").trim() || "Unknown";
}

/** People the signed-in user can start a private conversation with. */
export async function GET(req: Request) {
  try {
    const auth = await resolveMobileApiAuth(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const queryCompanyId = url.searchParams.get("companyId")?.trim() || undefined;
    const siteIdParam = url.searchParams.get("siteId")?.trim() || url.searchParams.get("site_id")?.trim() || "";
    let companyId = (auth.companyId ?? "").trim();
    if (auth.isSuperuser && queryCompanyId) companyId = queryCompanyId;
    if (!companyId) {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: companyId || undefined,
          userEmail: auth.userEmail ?? undefined,
          role: auth.role ?? undefined,
          queryCompanyId,
        })) || "";
    }
    if (!companyId || !auth.uid) {
      return NextResponse.json([], { status: 200 });
    }

    const { userIds } = await messageableUserIds({
      companyId,
      userId: auth.uid,
      role: auth.role,
      siteId: siteIdParam || null,
    });
    if (userIds.length === 0) return NextResponse.json([]);

    const { data: users, error } = await supabaseAdmin
      .from("users")
      .select("id, name, display_name, email, role")
      .in("id", userIds)
      .not("disabled", "eq", true)
      .order("name", { ascending: true });

    if (error) {
      console.warn("GET /api/messages/contacts:", error.message);
      return NextResponse.json([]);
    }

    const list = (users ?? []).map((u) => {
      const row = u as {
        id: string;
        name?: string | null;
        display_name?: string | null;
        email?: string | null;
        role?: string | null;
      };
      return {
        id: row.id,
        name: personLabel(row),
        email: row.email ?? null,
        role: row.role ?? null,
        staff: isMessagingStaffRole(row.role),
      };
    });

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/messages/contacts failed:", e);
    return NextResponse.json([], { status: 200 });
  }
}
