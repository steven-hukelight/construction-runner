import { redirect } from "next/navigation";

/**
 * Legacy route: /dashboard/rams redirects to Health & Safety > RAMS
 * for backward compatibility with bookmarks and links.
 */
export default function LegacyRAMSPage() {
  redirect("/dashboard/health-and-safety/rams");
}
