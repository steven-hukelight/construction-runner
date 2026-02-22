import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SuperuserAdminClient from "./SuperuserAdminClient";

export default async function SuperuserAdminPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  if (role !== "superuser") {
    redirect("/dashboard");
  }

  return (
    <div className="relative space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Multi-company admin
        </h1>
        <p className="text-gray-600">
          Unfiltered view of companies, users, sites, registrations, and activity. Superuser only.
        </p>
      </div>

      <SuperuserAdminClient />
    </div>
  );
}
