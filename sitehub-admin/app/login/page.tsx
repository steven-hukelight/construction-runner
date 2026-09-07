import { redirect } from "next/navigation";

/**
 * Legacy /login route - redirects to /admin/login
 */
export default function LoginRedirectPage() {
  redirect("/admin/login");
}
