import { redirect } from "next/navigation";

/** Notices retired — use Safety → Alerts. */
export default function SafetyNoticesLegacyRedirect() {
  redirect("/dashboard/health-and-safety/alerts");
}
