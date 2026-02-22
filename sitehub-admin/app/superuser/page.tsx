import { redirect } from "next/navigation";

/**
 * Superuser landing is now under the dashboard layout at /dashboard/superuser-dashboard.
 * Middleware redirects /superuser here; this redirect covers direct access.
 */
export default function SuperuserPage() {
  redirect("/dashboard/superuser-dashboard");
}
