import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SubcontractorOnboardingPage from "./SubcontractorOnboardingPage";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export default async function SubcontractorDashboardPage() {
  // The subcontractor onboarding page is a pre-induction upload workflow.
  // Hide it when the pre-induction UI is disabled; APIs and data stay intact.
  if (!preInductionUiEnabled) {
    redirect("/dashboard");
  }
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;

  if (role !== "sub_admin") {
    redirect("/dashboard");
  }

  return <SubcontractorOnboardingPage />;
}
