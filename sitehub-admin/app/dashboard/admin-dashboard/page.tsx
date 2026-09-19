import { fetchSites } from "../sites/actions";
import { fetchRAMS } from "../rams/actions";
import { fetchUsers } from "../users/actions";
import { fetchTasks } from "../tasks/actions";
import WelcomeBanner from "../components/WelcomeBanner";
import { DashboardContent } from "../components/DashboardContent";
import SuperuserSelfOverrideSection from "../induction-compliance/components/SuperuserSelfOverrideSection";
import { cookies } from "next/headers";
import { resolveCompanyId } from "@/lib/auth/companyId";
import { isSiteAttendanceRole } from "@/lib/auth/siteAttendanceUi";
import { deepSerializeForClient } from "@/lib/rscSerialize";

export default async function AdminDashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  let companyId = cookieStore.get("companyId")?.value || null;

  if (role !== "superuser" && !companyId) {
    const resolved = await resolveCompanyId({
      cookieCompanyId: cookieStore.get("companyId")?.value,
      userEmail: cookieStore.get("user_email")?.value,
      role,
    });
    companyId = resolved || null;
  }

  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  const [sites, rams, users, tasks] = await Promise.all([
    fetchSites(companyId ?? undefined, cookieHeader),
    fetchRAMS(companyId ?? undefined, cookieHeader),
    fetchUsers(companyId ?? undefined, role, cookieHeader),
    fetchTasks(companyId ?? undefined, cookieHeader),
  ]);

  const totalSites = sites?.length || 0;
  const activeRAMS = (rams || []).filter((r) => r?.status === "APPROVED").length || 0;
  const totalUsers = users?.length || 0;
  const totalTasks = tasks?.length || 0;

  const serializeData = (data: unknown) => {
    if (!Array.isArray(data)) return [];
    return data.map((item) => {
      if (!item) return item;
      const serialized = { ...item } as Record<string, unknown>;

      const fix = (field: string) => {
        const val = serialized[field];
        if (val && typeof val === "object" && typeof (val as { toDate?: () => Date }).toDate === "function") {
          try {
            serialized[field] = (val as { toDate: () => Date }).toDate().toISOString();
          } catch {
            serialized[field] = null;
          }
        }
      };

      fix("createdAt");
      fix("updatedAt");
      fix("dueDate");

      return serialized;
    });
  };

  const serializedSites = serializeData(sites);
  const serializedRAMS = serializeData(rams);
  const serializedUsers = serializeData(users);
  const serializedTasks = serializeData(tasks);

  return (
    <div className="space-y-8 pb-12">
      <WelcomeBanner showSiteAttendance={isSiteAttendanceRole(role)} />
        <SuperuserSelfOverrideSection role={role ?? null} />

        <DashboardContent
          totalSites={totalSites}
          activeRAMS={activeRAMS}
          totalUsers={totalUsers}
          totalTasks={totalTasks}
          sites={deepSerializeForClient(serializedSites)}
          rams={deepSerializeForClient(serializedRAMS)}
          users={deepSerializeForClient(serializedUsers)}
          tasks={deepSerializeForClient(serializedTasks)}
        />
    </div>
  );
}
