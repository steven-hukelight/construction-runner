import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./components/layout/Sidebar";
import SuperuserSidebar from "./components/layout/SuperuserSidebar";
import Topbar from "./components/layout/Topbar";
import SessionTimeoutHandler from "./components/SessionTimeoutHandler";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // No longer sync companyId from localStorage; always use cookies
    const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const impersonating = cookieStore.get("impersonating")?.value === "true";

  if (!role) {
    redirect("/login");
  }

  // If superuser and impersonating, show user Sidebar; otherwise show SuperuserSidebar or Sidebar
  const showSidebar = role === "superuser" && impersonating ? <Sidebar role={role} /> : role === "superuser" ? <SuperuserSidebar /> : <Sidebar role={role} />;

  return (
    <div className="app-root">
      <SessionTimeoutHandler />
      {showSidebar}
      <main className="main-content">
        <Topbar />
        {children}
      </main>
    </div>
  );
}
