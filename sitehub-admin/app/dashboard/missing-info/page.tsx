import { redirect } from "next/navigation";
import { preInductionUiEnabled } from "@/lib/featureFlags";

export default function MissingInfoPage() {
  redirect(preInductionUiEnabled ? "/dashboard/induction-compliance" : "/dashboard/users?tab=missing");
}
