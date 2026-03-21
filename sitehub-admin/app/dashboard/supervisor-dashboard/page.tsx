import Link from "next/link";
import PageHeader from "@/app/dashboard/components/PageHeader";
import WelcomeBanner from "@/app/dashboard/components/WelcomeBanner";
import SupervisorComplianceSection from "./components/SupervisorComplianceSection";

export default function SupervisorDashboardPage() {
  return (
    <div className="space-y-6">
      <WelcomeBanner subtitle="Here's an overview of your sites, attendance, and induction status." />
      <PageHeader
        title="Supervisor Dashboard"
        description="Quick access to attendance, induction, and compliance tools."
      />
      <SupervisorComplianceSection />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/dashboard/attendance"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: "#2563EB" }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Attendance</h3>
            <p className="text-sm text-gray-500">Sign in/out, live attendance, role call</p>
          </div>
        </Link>
        <Link
          href="/dashboard/supervisor-dashboard/induction"
          className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: "#2563EB" }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Induction</h3>
            <p className="text-sm text-gray-500">View induction status by site</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
