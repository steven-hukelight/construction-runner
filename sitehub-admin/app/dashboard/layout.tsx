import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./components/layout/Sidebar";
import SuperuserSidebar from "./components/layout/SuperuserSidebar";
import Topbar from "./components/layout/Topbar";
import SessionTimeoutHandler from "./components/SessionTimeoutHandler";
import GlobalBanner from "./components/GlobalBanner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // No longer sync companyId from localStorage; always use cookies
    const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value;
  const roleLower = role?.toLowerCase();
  const impersonating = cookieStore.get("impersonating")?.value === "true";
  const companyId = cookieStore.get("companyId")?.value;
  const isSuperuser = roleLower === "superuser";

  if (!role) {
    redirect("/login");
  }

  // Operative web login is a future feature – block access to any dashboard route
  if (roleLower === "operative") {
    redirect("/login?blocked=operative");
  }

  // If superuser and impersonating (has companyId), show company Sidebar with effective role "admin" so they see Sites, Users, etc.
  const effectiveRole = isSuperuser && impersonating && companyId ? "admin" : role;
  const showSidebar = isSuperuser && impersonating && companyId
    ? <Sidebar role={effectiveRole} />
    : isSuperuser
      ? <SuperuserSidebar />
      : <Sidebar role={effectiveRole} />;

  return (
    <div className="app-root">
      <SessionTimeoutHandler />
      {showSidebar}
      <main className="main-content flex flex-col">
        <GlobalBanner />
        <Topbar />
        {children}
      </main>
    </div>
  );
}
