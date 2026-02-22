import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import PageHeader from "../components/PageHeader";
import MessagingContent from "./MessagingContent";

export default async function MessagingPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="relative space-y-8">
        <PageHeader title="Messaging" description="Select a company to use messaging." />
        <div className="text-center text-gray-500 py-12">Impersonate a company to view messages.</div>
      </div>
    );
  }

  let companyId = cookieStore.get("companyId")?.value?.trim();
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }

  if (!companyId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">No Company</h1>
        <p className="text-gray-500">You need to be associated with a company to use messaging.</p>
      </div>
    );
  }

  const canDelete = ["admin", "superuser", "supervisor", "sub_admin"].includes((role ?? "").toLowerCase());

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Messaging"
        description="Real-time messaging with operatives and supervisors."
      />
      <MessagingContent companyId={companyId} canDelete={canDelete} />
    </div>
  );
}
