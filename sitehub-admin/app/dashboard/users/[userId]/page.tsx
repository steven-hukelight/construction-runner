import { cookies } from "next/headers";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PageHeader from "@/app/dashboard/components/PageHeader";
import RoleBadge from "@/app/dashboard/components/RoleBadge";
import { resolveCompanyId } from "@/lib/auth/companyId";
import PreInductionOverrideToggle from "./pre-induction/components/PreInductionOverrideToggle";
import { preInductionUiEnabled } from "@/lib/featureFlags";

function cid(data: Record<string, unknown> | undefined): string {
  return String(data?.company_id ?? data?.companyid ?? "").trim();
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
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

  const roleLower = (role ?? "").toLowerCase();
  if (roleLower === "operative") {
    const { data: me } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", cookieStore.get("user_email")?.value ?? "")
      .maybeSingle();
    if (me && userId !== me.id) {
      return (
        <div className="space-y-6">
          <PageHeader title="User" description="Access denied. Operatives can only view their own profile." />
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">← Back to dashboard</Link>
        </div>
      );
    }
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .limit(1)
    .maybeSingle();

  if (!userRow) {
    return (
      <div className="space-y-6">
        <PageHeader title="User" description="User not found." />
        <Link href={role === "superuser" ? "/dashboard/all-users" : "/dashboard/users"} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to {role === "superuser" ? "all users" : "users"}
        </Link>
      </div>
    );
  }

  const data = userRow as Record<string, unknown>;
  const userCompanyId = cid(data);
  if (role !== "superuser" && companyId !== userCompanyId) {
    return (
      <div className="space-y-6">
        <PageHeader title="User" description="Access denied." />
        <Link href={role === "superuser" ? "/dashboard/all-users" : "/dashboard/users"} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to {role === "superuser" ? "all users" : "users"}
        </Link>
      </div>
    );
  }

  // Resolve name from users or pre_induction_personal
  let name = (data?.display_name ?? data?.email ?? "—") as string;
  if ((!name || name === "—") && data?.email) {
    const { data: personal } = await supabaseAdmin
      .from("pre_induction_personal")
      .select("full_name, data")
      .eq("user_id", userRow.id)
      .maybeSingle();
    const pr = personal as { full_name?: string | null; data?: Record<string, unknown> } | null;
    const fullName = pr?.full_name ?? pr?.data?.full_name ?? pr?.data?.fullName;
    if (fullName && String(fullName).trim()) name = String(fullName).trim();
  }
  if (!name || name === "—") name = (data?.email as string) ?? "—";

  const email = (data?.email ?? "—") as string;
  const userRole = (data?.role ?? "—") as string;
  let phone = (data?.phone ?? "") as string;
  if (!phone && data?.email) {
    const { data: personal } = await supabaseAdmin
      .from("pre_induction_personal")
      .select("phone, data")
      .eq("user_id", userRow.id)
      .maybeSingle();
    const pr = personal as { phone?: string | null; data?: Record<string, unknown> } | null;
    phone = (pr?.phone ?? pr?.data?.phone ?? "") as string;
  }
  const phoneDisplay = phone && String(phone).trim() ? String(phone).trim() : "Not set";

  let companyName: string | null = null;
  if (userCompanyId) {
    const { data: co } = await supabaseAdmin.from("companies").select("name").eq("id", userCompanyId).maybeSingle();
    companyName = (co as { name?: string } | null)?.name ?? null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
        <Link href={role === "superuser" ? "/dashboard/all-users" : "/dashboard/users"} className="text-blue-600 hover:text-blue-700 font-medium">
          ← Back to {role === "superuser" ? "all users" : "users"}
        </Link>
      </div>
      <PageHeader
        title={name}
        description={email}
        action={
          <div className="flex flex-wrap items-center gap-3">
          {preInductionUiEnabled && (
            <Link
              href={`/dashboard/users/${userRow.id}/pre-induction`}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90"
              style={{ backgroundColor: "#2563EB" }}
            >
              Pre-Induction
            </Link>
          )}
          <Link
            href={`/dashboard/users/${userRow.id}/induction`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Induction
          </Link>
          <Link
            href={`/dashboard/operatives/${userRow.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Operative profile
          </Link>
          </div>
        }
      />
      {/* Pre-Induction Override - superuser/admin can override when requested.
          Hidden entirely when the pre-induction UI is disabled. */}
      {preInductionUiEnabled &&
        (role === "superuser" || role === "admin" || role === "ADMIN" || role === "sub_admin") && (
        <PreInductionOverrideToggle
          userId={userRow.id}
          adminPreInductionOverride={!!(data?.admin_pre_induction_override ?? data?.adminPreInductionOverride)}
          canEdit={true}
        />
      )}
      {/* Personal Information - mirrors profile/settings structure */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h4 className="font-semibold text-slate-900 text-sm mb-4">Personal Information</h4>
        <p className="text-sm text-gray-600 mb-4">
          Same fields as profile/settings. Edit via Pre-Induction or the user&apos;s own Profile.
        </p>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Name</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Email address</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Phone</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{phoneDisplay}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Role</dt>
            <dd className="mt-0.5">
              <RoleBadge role={userRole === "—" ? null : userRole} />
            </dd>
          </div>
          {companyName && (
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Company</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">{companyName}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
