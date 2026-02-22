import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";

/** POST: Archive today's role call for a site. Clears the view for the next session. */
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const role = (cookieStore.get("role")?.value ?? "").toLowerCase();
    const userEmail = cookieStore.get("user_email")?.value;
    let companyId = cookieStore.get("companyId")?.value?.trim();

    const canArchive = ["admin", "superuser", "supervisor", "sub_admin"].includes(role);
    if (!canArchive) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!companyId) {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail,
          role,
        })) || "";
    }
    if (!companyId) return NextResponse.json({ error: "Company required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const snapshot = Array.isArray(body?.snapshot) ? body.snapshot : [];
    const archiveDate = body?.date?.trim() || new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const siteId = body?.siteId ?? body?.site_id ?? null;

    const [y, m, d] = archiveDate.split("-").map(Number);
    if (!y || !m || !d) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("role_call_archive").insert({
      company_id: companyId,
      site_id: siteId,
      archive_date: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      snapshot,
    });

    if (error) {
      console.error("role-call-archive insert:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, archived: snapshot.length });
  } catch (e) {
    console.error("POST /api/attendance/role-call-archive failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
