import PageHeader from "../components/PageHeader";
import UsersTable from "./UsersTable";
import InviteUserModal from "./InviteUserModal";
import { fetchUsers } from "./actions";
import { fetchProfiles } from "./profileActions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";

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

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">You must impersonate a company to view the Users page.</p>
        <p className="text-gray-500">Use the sidebar to select a company to impersonate.</p>
      </div>
    );
  }

  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const users = await fetchUsers(companyId ?? undefined, role ?? undefined, cookieHeader);
  const profiles = await fetchProfiles();
  const currentUserRole = cookieStore.get("role")?.value || "";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description="Manage user accounts and roles."
        action={
          <div className="flex items-center gap-3">
            <InviteUserModal />
          </div>
        }
      />

      <div className="relative">
        {/* Decorative background element */}
        <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-blue-400/10 to-blue-500/10 rounded-full blur-3xl -z-10" />
        
        <UsersTable
          data={deepSerializeForClient(users)}
          profiles={deepSerializeForClient(profiles)}
          currentUserRole={currentUserRole}
        />
      </div>
    </div>
  );
}
