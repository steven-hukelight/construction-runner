import TasksSection from "./TasksSection";
import { fetchTasks } from "./actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";

export default async function TasksPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (role === "superuser" && !impersonating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-2xl font-bold mb-4">Superuser: No Company Selected</h1>
        <p className="mb-6">You must impersonate a company to view the Tasks page.</p>
        <p className="text-gray-500">Use the sidebar to select a company to impersonate.</p>
      </div>
    );
  }

  let companyId = cookieStore.get("companyId")?.value;
  if (!companyId && role !== "superuser") {
    companyId =
      (await resolveCompanyId({
        cookieCompanyId: cookieStore.get("companyId")?.value,
        userEmail: cookieStore.get("user_email")?.value,
        role,
      })) || undefined;
  }
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
  const tasks = await fetchTasks(companyId ?? undefined, cookieHeader);

  return <TasksSection data={deepSerializeForClient(tasks)} />;
}
