import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { redirect } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import RAMSDetailClient from "./RAMSDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function RAMSDetailPage({ params }: PageProps) {
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
    redirect("/dashboard/health-and-safety/rams");
  }

  const roleLower = role?.toLowerCase() ?? "";
  const canViewAcknowledgements =
    roleLower === "admin" || roleLower === "supervisor" || roleLower === "superuser";

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="RAMS Document"
        description="View version history, acknowledge, and manage RAMS."
      />
      <RAMSDetailClient
        ramsId={id}
        companyId={companyId ?? null}
        canViewAcknowledgements={canViewAcknowledgements}
      />
    </div>
  );
}
