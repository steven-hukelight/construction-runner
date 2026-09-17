import { cookies } from "next/headers";
import { redirect } from "next/navigation";

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

  if (roleLower === "superuser" && !impersonating) {
    redirect("/dashboard/superuser-dashboard");
  }

  if (roleLower === "admin" || roleLower === "site_admin" || roleLower === "sub_admin") {
    redirect("/dashboard/admin-dashboard");
  }

  if (roleLower === "supervisor") {
    redirect("/dashboard/supervisor-dashboard");
  }

  // Superuser impersonating → company (admin) dashboard
  redirect("/dashboard/admin-dashboard");
}
