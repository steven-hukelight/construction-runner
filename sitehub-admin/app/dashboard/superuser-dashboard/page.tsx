import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  Settings,
  Wrench,
  LayoutDashboard,
  LayoutGrid,
  ArrowRight,
} from "lucide-react";
import ApprovalsSection from "./ApprovalsSection";
import SuperuserSelfOverrideSection from "../induction-compliance/components/SuperuserSelfOverrideSection";

export default async function SuperuserDashboardPage() {
  const cookieStore = await cookies();
  const role = cookieStore.get("role")?.value?.toLowerCase()?.trim();
  const companyId = cookieStore.get("companyId")?.value;
  if (role !== "superuser") {
    redirect("/dashboard");
  }

  const cards = [
    {
      title: "Multi-company Admin",
      description: "Companies, users, sites, registrations, activity — unfiltered",
      href: "/dashboard/superuser-admin",
      icon: LayoutGrid,
    },
    {
      title: "Companies",
      description: "Manage tenants and invite codes",
      href: "/dashboard/companies",
      icon: Building2,
    },
    {
      title: "All Users",
      description: "View and manage users across companies",
      href: "/dashboard/all-users",
      icon: Users,
    },
    {
      title: "System Logs",
      description: "Audit and system activity",
      href: "/dashboard/system-logs",
      icon: FileText,
    },
    {
      title: "Global Settings",
      description: "Platform-wide configuration",
      href: "/dashboard/global-settings",
      icon: Settings,
    },
    {
      title: "Superuser Tools",
      description: "Maintenance and data tools",
      href: "/dashboard/superuser-tools",
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
          Superuser Dashboard
        </h1>
        <p className="text-gray-600">
          Manage tenants, users, and system settings. Use the company switcher in the top bar to
          impersonate a company and view their dashboard.
        </p>
      </div>

        <SuperuserSelfOverrideSection role={role} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="card flex flex-col p-5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <Icon className="w-5 h-5 text-blue-600" />
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-700" />
                </div>
                <h2 className="font-semibold text-gray-900 mb-1">{item.title}</h2>
                <p className="text-sm text-gray-600 flex-1">{item.description}</p>
              </Link>
            );
          })}
        </div>

        <ApprovalsSection />

        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-blue-600" />
            View company dashboard
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {companyId
              ? "Open the dashboard for the company currently selected in the top bar."
              : "Select a company from the switcher in the top bar, or go to Companies to enter a company dashboard."}
          </p>
          <Link
            href={companyId ? "/dashboard" : "/dashboard/companies"}
            className="inline-flex items-center gap-2 text-blue-600 font-medium hover:underline"
          >
            {companyId ? "Open Dashboard" : "Go to Companies"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
    </div>
  );
}
