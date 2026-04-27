import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
import Sidebar from "./components/layout/Sidebar";
import SuperuserSidebar from "./components/layout/SuperuserSidebar";
import Topbar from "./components/layout/Topbar";
import SessionTimeoutHandler from "./components/SessionTimeoutHandler";
import GlobalBanner from "./components/GlobalBanner";
import OneSignalProvider from "./components/OneSignalProvider";
import { DashboardMainShell } from "./components/DashboardMainShell";
import { validateSession, updateSessionActivity } from "@/lib/sessions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let cookieStore: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    cookieStore = await cookies();
  } catch (e) {
    console.error("[DashboardLayout] cookies() failed:", e);
  }
  if (!cookieStore) {
    redirect("/admin/login");
  }

  const role = cookieStore.get("role")?.value;
  const roleLower = role?.toLowerCase();
  const impersonating = cookieStore.get("impersonating")?.value === "true";
  const companyId = cookieStore.get("companyId")?.value;
  const isSuperuser = roleLower === "superuser";
  const sessionId = cookieStore.get("session_id")?.value;

  if (!role) {
    redirect("/admin/login");
  }

  if (sessionId) {
    let validation: Awaited<ReturnType<typeof validateSession>> | null = null;
    try {
      validation = await validateSession(sessionId);
    } catch (e) {
      console.error("[DashboardLayout] session validation failed:", e);
    }
    if (validation == null) {
      redirect("/admin/login");
    }
    if (!validation.valid) {
      const reason = validation.reason ?? "idle_timeout";
      redirect(
        `/admin/login?${reason === "absolute_timeout" ? "expired=1" : "timeout=1"}`,
      );
    }
    try {
      await updateSessionActivity(sessionId);
    } catch (e) {
      console.error("[DashboardLayout] updateSessionActivity failed:", e);
    }
  }

  // Operative web login is a future feature – block access to any dashboard route
  if (roleLower === "operative") {
    redirect("/admin/login?blocked=operative");
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
      <OneSignalProvider />
      <SessionTimeoutHandler />
      {showSidebar}
      <DashboardMainShell>
        <GlobalBanner />
        <Topbar />
        {children}
      </DashboardMainShell>
    </div>
  );
}
