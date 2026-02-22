import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SubcontractorOnboardingPage from "./SubcontractorOnboardingPage";

export default async function SubcontractorDashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;

  if (role !== "sub_admin") {
    redirect("/dashboard");
  }

  return <SubcontractorOnboardingPage />;
}
