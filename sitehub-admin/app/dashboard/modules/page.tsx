import { redirect } from "next/navigation";

/** Combined Modules landing is retired — each area has its own sidebar route. */
export default function ModulesPage() {
  redirect("/dashboard");
}
