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
import { dashboardSiteScope } from "@/lib/auth/siteScope";
import { userIdsForSiteContent } from "@/lib/auth/siteAudience";
import Link from "next/link";

const headerButtonBase =
  "inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium transition-colors duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const primaryHeaderButton = `${headerButtonBase} bg-blue-600 text-white hover:bg-blue-700`;
const secondaryHeaderButton = `${headerButtonBase} border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200`;

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

/** Only the fields the dashboard cards, charts and activity feed read: id, created date and the given extras. */
type SlimRow = {
  id: string;
  created_at: string | null;
  status?: string;
  role?: string;
  name?: string;
  title?: string;
  display_name?: string;
};

function slimRows(rows: unknown, extra: ("status" | "role" | "name" | "title" | "display_name")[] = []): SlimRow[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
    .map((row) => {
      const out: SlimRow = { id: String(row.id ?? ""), created_at: isoOrNull(row.created_at ?? row.createdAt) };
      for (const key of extra) if (typeof row[key] === "string") out[key] = row[key] as string;
      return out;
    });
}

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


  const selectedSiteId = cookieStore.get("currentSiteId")?.value?.trim();
  const siteScope = selectedSiteId
    ? (async () => {
        const scope = await dashboardSiteScope(role, selectedSiteId, cookieStore.get("uid")?.value);
        const siteIds = Array.isArray(scope) ? scope : [];
        const memberIds = new Set(
          (await Promise.all(siteIds.map((id) => userIdsForSiteContent(companyId ?? "", id)))).flat()
        );
        return { siteIds, memberIds };
      })()
    : null;

  const [allSites, rams, allUsers, tasks, scope] = await Promise.all([
    fetchSites(companyId ?? undefined),
    fetchRAMS(companyId ?? undefined),
    fetchUsers(companyId ?? undefined, role),
    fetchTasks(companyId ?? undefined),
    siteScope,
  ]);

  let sites = allSites;
  let users = allUsers;
  if (scope) {
    sites = allSites.filter((s: { id?: unknown }) => scope.siteIds.includes(String(s?.id ?? "")));
    users = allUsers.filter((u: { id?: unknown }) => scope.memberIds.has(String(u?.id ?? "")));
  }

  const totalSites = sites.length;
  const activeRAMS = rams.filter((r) => r?.status === "APPROVED").length;
  const totalUsers = users.length;
  const totalTasks = tasks.length;

  const serializedSites = slimRows(sites, ["name"]);
  const serializedRAMS = slimRows(rams, ["status", "title"]);
  const serializedUsers = slimRows(users, ["role", "name", "display_name"]);
  const serializedTasks = slimRows(tasks, ["status"]);

  return (
    <div className="space-y-8 pb-12">
      <WelcomeBanner
        showSiteAttendance={isSiteAttendanceRole(role)}
        actions={
          <>
            <Link href="/dashboard/sites" title="Set up a job and assign the team" className={primaryHeaderButton}>
              Add a site
            </Link>
            <Link
              href="/dashboard/health-and-safety/rams"
              title="Method statements for operatives to sign"
              className={secondaryHeaderButton}
            >
              Issue RAMS
            </Link>
            <Link href="/dashboard/users" title="Invite supervisors and operatives" className={secondaryHeaderButton}>
              Add people
            </Link>
          </>
        }
      />
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
