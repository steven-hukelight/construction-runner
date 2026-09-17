import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function SuperuserToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const role = (await cookies()).get("role")?.value?.toLowerCase();
  if (role !== "superuser") {
    redirect("/dashboard");
  }
  return children;
}
