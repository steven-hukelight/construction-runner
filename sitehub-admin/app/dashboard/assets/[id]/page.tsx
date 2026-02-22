import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { redirect } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import AssetDetailClient from "./AssetDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value?.trim();

  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }

  if (!companyId && role !== "superuser") {
    redirect("/dashboard/assets");
  }

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Asset Details"
        description="View and manage asset assignments, inspections, and documents."
      />
      <AssetDetailClient assetId={id} companyId={companyId ?? ""} />
    </div>
  );
}
