import { cookies } from "next/headers";
import SiteSafetyPackClient from "./SiteSafetyPackClient";
import { canEditSiteSafetyPack } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function SiteSafetyPage({
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
        Operatives read this during site induction and must tick that they have acknowledged it.
        Starts from the company default; edit it for this site only.
      </p>
      <SiteSafetyPackClient siteId={id} canEdit={canEditSiteSafetyPack(role)} />
    </div>
  );
}
