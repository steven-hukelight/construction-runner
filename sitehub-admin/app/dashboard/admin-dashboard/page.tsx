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
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-sky-50/30 to-cyan-50/50 dark:from-slate-900/95 dark:via-slate-800/90 dark:to-slate-900/95" />
        <div className="absolute top-0 right-[10%] w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-blue-500/20 dark:from-blue-500/10 dark:to-blue-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute top-[40%] left-[5%] w-[400px] h-[400px] bg-gradient-to-tr from-blue-300/15 to-blue-500/15 dark:from-blue-400/8 dark:to-blue-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "10s", animationDelay: "2s" }} />
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] bg-gradient-to-bl from-blue-400/20 to-cyan-400/20 dark:from-blue-500/8 dark:to-cyan-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDuration: "12s", animationDelay: "4s" }} />
        <svg className="absolute top-20 left-10 w-32 h-32 text-blue-600/5" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="currentColor" /></svg>
        <svg className="absolute bottom-40 right-32 w-24 h-24 text-blue-600/5" viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" fill="currentColor" transform="rotate(45 50 50)" /></svg>
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `
            linear-gradient(rgba(37, 99, 235, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(37, 99, 235, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "100px 100px",
        }} />
      </div>

      <div className="space-y-8 pb-12 relative z-10">
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
    </div>
  );
}
