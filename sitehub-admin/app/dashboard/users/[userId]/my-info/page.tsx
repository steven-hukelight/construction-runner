import { cookies } from "next/headers";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PageHeader from "@/app/dashboard/components/PageHeader";
import { resolveCompanyId } from "@/lib/auth/companyId";
import MyInfoEditor from "./MyInfoEditor";

/**
 * Admin/supervisor view of a worker's My Info (medical, emergency contact,
 * competency card, declarations). Replaces the old /pre-induction route.
 *
 * ACL:
 *   - superuser: any worker
 *   - admin / supervisor: same company as caller
 *   - operative: only their own record (via /api/me/info; the mobile app is
 *     the primary self-service surface)
 */
export default async function UserMyInfoPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const cookieStore = await cookies();
  const role = (cookieStore.get("role")?.value ?? "").toLowerCase();

  // Operatives can only see their own record; redirect elsewhere is handled by
  // the /api/me/info surface. Here we just guard.
  if (role === "operative") {
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", cookieStore.get("user_email")?.value ?? "")
      .maybeSingle();
    if (!me || me.id !== userId) {
      return (
        <div className="space-y-6">
          <PageHeader title="My Info" description="Access denied." />
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to dashboard
          </Link>
        </div>
      );
    }
  }

  // Same-company check for non-superusers.
  if (role !== "superuser" && role !== "operative") {
    let companyId = cookieStore.get("companyId")?.value?.trim();
    if (!companyId) {
      companyId =
        (await resolveCompanyId({
          cookieCompanyId: cookieStore.get("companyId")?.value,
          userEmail: cookieStore.get("user_email")?.value,
          role,
        })) || undefined;
    }
    const { data: target } = await supabaseAdmin
      .from("users")
      .select("company_id, display_name, email")
      .eq("id", userId)
      .maybeSingle();
    if (!target || String((target as { company_id?: string }).company_id ?? "").trim() !== (companyId ?? "")) {
      return (
        <div className="space-y-6">
          <PageHeader title="My Info" description="Access denied." />
          <Link href="/dashboard/users" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to users
          </Link>
        </div>
      );
    }
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, display_name, email")
    .eq("id", userId)
    .maybeSingle();

  const name =
    (user as { display_name?: string; email?: string } | null)?.display_name ??
    (user as { email?: string } | null)?.email ??
    "Worker";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <Link href={`/dashboard/users/${userId}`} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to profile
        </Link>
      </div>
      <PageHeader
        title="My Info"
        description={`Medical, emergency contact, competency card and declarations for ${name}. Edits are audit-logged.`}
      />
      <MyInfoEditor userId={userId} />
    </div>
  );
}
