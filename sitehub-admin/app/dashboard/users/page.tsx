import PageHeader from "../components/PageHeader";
import UsersTable from "./UsersTable";
import InviteUserModal from "./InviteUserModal";
import { fetchUsers } from "./actions";
import { fetchProfiles } from "./profileActions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import SuperuserCompanyGate from "../components/SuperuserCompanyGate";

export default async function UsersPage() {
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

  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const users = await fetchUsers(companyId ?? undefined, role ?? undefined, cookieHeader);
  const profiles = await fetchProfiles();
  const currentUserRole = cookieStore.get("role")?.value || "";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="Company accounts, roles, and medical records."
        action={
          <div className="flex items-center gap-3">
            <InviteUserModal />
          </div>
        }
      />

      <div className="relative">
        {/* Decorative background element */}
        
        <UsersTable
          data={deepSerializeForClient(users)}
          profiles={deepSerializeForClient(profiles)}
          currentUserRole={currentUserRole}
        />
      </div>
    </div>
  );
}
