import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const VALID_ROLES = ["superuser", "admin", "ADMIN", "supervisor", "SUPERVISOR", "operative", "OPERATIVE", "sub_admin"];

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value?.trim();
  const roleLower = role?.toLowerCase();
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  // Role missing or invalid → login (do not default to admin)
  if (!role || !VALID_ROLES.includes(role)) {
    redirect("/login");
  }

  if (roleLower === "superuser" && !impersonating) {
    redirect("/dashboard/superuser-dashboard");
  }

  if (roleLower === "admin") {
    redirect("/dashboard/admin-dashboard");
  }

  if (roleLower === "operative") {
    redirect("/dashboard/operative-dashboard");
  }

  if (roleLower === "sub_admin") {
    redirect("/dashboard/admin-dashboard");
  }

  if (roleLower === "supervisor") {
    redirect("/dashboard/supervisor-dashboard");
  }

  // Superuser impersonating → company (admin) dashboard
  redirect("/dashboard/admin-dashboard");
}
