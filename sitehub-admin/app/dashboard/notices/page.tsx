import { redirect } from "next/navigation";

/** Notices were retired in favour of Safety → Alerts. */
export default function LegacyNoticesRedirectPage() {
  redirect("/dashboard/health-and-safety/alerts");
}
