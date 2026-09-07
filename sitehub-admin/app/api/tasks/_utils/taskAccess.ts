import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { resolveMobileApiAuth } from "@/app/api/_utils/mobileAuth";

const STAFF_ROLES = new Set(["superuser", "admin", "supervisor", "sub_admin"]);

/**
 * Returns null if caller may read the task, otherwise a NextResponse error.
 * Supports Bearer (mobile) and session cookies (web).
 */
export async function ensureTaskReadAccess(req: Request, taskId: string): Promise<NextResponse | null> {
  const auth = await resolveMobileApiAuth(req);
  const { data: task, error } = await supabaseAdmin
    .from("tasks")
    .select("company_id, assigned_to")
    .eq("id", taskId)
    .maybeSingle();

  if (error || !task) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const t = task as { company_id?: string | null; assigned_to?: string | null };
  const roleLower = (auth.role ?? "").toLowerCase();

  if (auth.uid) {
    if (auth.isSuperuser || roleLower === "superuser") return null;
    if (STAFF_ROLES.has(roleLower) && auth.companyId && t.company_id === auth.companyId) {
      return null;
    }
    const { data: asn } = await supabaseAdmin
      .from("task_assignments")
      .select("id")
      .eq("task_id", taskId)
      .eq("user_id", auth.uid)
      .maybeSingle();
    if (asn || t.assigned_to === auth.uid) return null;
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  if (role === "superuser") return null;
  if (!companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (t.company_id !== companyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/** Same as read for now; staff may get extra PATCH fields in route handler. */
export async function ensureTaskWriteAccess(req: Request, taskId: string): Promise<NextResponse | null> {
  return ensureTaskReadAccess(req, taskId);
}

export function isStaffRole(role: string | null): boolean {
  return STAFF_ROLES.has((role ?? "").toLowerCase());
}
