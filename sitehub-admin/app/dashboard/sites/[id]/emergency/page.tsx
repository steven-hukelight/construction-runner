import { cookies } from "next/headers";
import { canEditSiteSafetyPack } from "@/lib/auth/roles";
import EmergencyPlanClient from "./EmergencyPlanClient";

export const dynamic = "force-dynamic";

export default async function SiteEmergencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-slate-400">
        Fire strategy, site plan and muster points for this site. Anyone signed in can raise an
        alarm; this is what they see on their phone. It supplements the site&apos;s physical fire
        alarm and does not replace it.
      </p>
      <EmergencyPlanClient siteId={id} canEdit={canEditSiteSafetyPack(role)} />
    </div>
  );
}
