import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { redirect } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import MessageThreadClient from "./MessageThreadClient";

interface PageProps {
  params: Promise<{ threadId: string }>;
}

export default async function MessageThreadPage({ params }: PageProps) {
  const { threadId } = await params;
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
    redirect("/dashboard/messaging");
  }

  const canDelete = ["admin", "superuser", "supervisor", "sub_admin"].includes((role ?? "").toLowerCase());

  return (
    <div className="relative space-y-8">
      <PageHeader
        title="Message Thread"
        description="View and respond to messages."
      />
      <MessageThreadClient threadId={threadId} companyId={companyId ?? ""} canDelete={canDelete} />
    </div>
  );
}
