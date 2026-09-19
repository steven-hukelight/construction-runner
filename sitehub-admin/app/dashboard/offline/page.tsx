import { redirect } from "next/navigation";

/** Offline sync was never wired to the app; keep the route out of the product surface. */
export default function OfflinePage() {
  redirect("/dashboard");
}
