import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dashboardHomeForRole } from "@/lib/auth/dashboardHome";

const VALID_ROLES = new Set([
  "superuser",
  "admin",
  "site_admin",
  "supervisor",
  "sub_admin",
]);

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value?.trim();
  const roleLower = role?.toLowerCase();
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  // Operative web login is a future feature – redirect operatives to login
  if (roleLower === "operative") {
    redirect("/admin/login?blocked=operative");
  }

  // Role missing or invalid → login (do not default to admin)
  if (!role || !roleLower || !VALID_ROLES.has(roleLower)) {
    redirect("/admin/login");
  }

  redirect(dashboardHomeForRole(roleLower, impersonating));
}
