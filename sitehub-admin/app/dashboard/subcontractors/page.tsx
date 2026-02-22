import PageHeader from "../components/PageHeader";
import SubcontractorsList from "./SubcontractorsList";
import { cookies } from "next/headers";

export default async function SubcontractorsPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">Impersonate a company to view Subcontractors.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 rounded-full blur-3xl -z-10" />
      <PageHeader
        title="Subcontractors"
        description="Partner companies linked to your sites. Invite and manage subcontractors."
      />
      <SubcontractorsList />
    </div>
  );
}
