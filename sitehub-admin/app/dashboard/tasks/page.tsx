import TasksSection from "./TasksSection";
import { fetchTasks } from "./actions";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { deepSerializeForClient } from "@/lib/rscSerialize";
import SuperuserCompanyGate from "../components/SuperuserCompanyGate";

export default async function TasksPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if ((role ?? "").toLowerCase() === "superuser" && !impersonating) {
    return <SuperuserCompanyGate title="Tasks" description="Select a company to view and manage tasks." />;
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
