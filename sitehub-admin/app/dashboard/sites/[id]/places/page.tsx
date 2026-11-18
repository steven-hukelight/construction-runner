import { cookies } from "next/headers";
import { canAssignOperativesToSites } from "@/lib/auth/roles";
import PlacesClient from "./PlacesClient";

export const dynamic = "force-dynamic";

export default async function SitePlacesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-slate-400">
        Who was on which plot or area today. The sign-in clock stays separate. This is not a timesheet and it is not an
        invoice.
      </p>
      <PlacesClient siteId={id} canEdit={canAssignOperativesToSites(role)} />
    </div>
  );
}
