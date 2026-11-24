import PageHeader from "../components/PageHeader";
import UsersTable from "./UsersTable";
import InviteUserModal from "./InviteUserModal";
import UsersTabs from "./UsersTabs";
import MissingInfoTable from "../missing-info/MissingInfoTable";
import { fetchUsers } from "./actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import SuperuserCompanyGate from "../components/SuperuserCompanyGate";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export default async function UsersPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
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
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Users" description="Select a company to view and manage users." />;
  }

  const params = await Promise.resolve(searchParams ?? {});
  const tabRaw = typeof params.tab === "string" ? params.tab : Array.isArray(params.tab) ? params.tab[0] : undefined;
  const showMissingTab = !preInductionUiEnabled;
  const tab = showMissingTab && tabRaw === "missing" ? "missing" : "people";

  const users = tab === "missing" ? [] : await fetchUsers(companyId ?? undefined, role ?? undefined);
  const currentUserRole = cookieStore.get("role")?.value || "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description={
          tab === "missing"
            ? "Workers missing an emergency contact or medical info."
            : "Company accounts, roles, and medical records."
        }
        action={
          <div className="flex items-center gap-3">
            <InviteUserModal />
          </div>
        }
      />

      {showMissingTab ? <UsersTabs tab={tab} /> : null}

      <div className="relative">
        {tab === "missing" ? (
          <MissingInfoTable embedded />
        ) : (
          <UsersTable data={deepSerializeForClient(users)} currentUserRole={currentUserRole} />
        )}
      </div>
    </div>
  );
}
