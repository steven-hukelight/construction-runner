"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, MessageSquare, ScrollText, FlaskConical, AlertTriangle, AlertCircle } from "lucide-react";

const subTabs = [
  { name: "RAMS", href: "/dashboard/health-and-safety/rams", icon: FileText },
  { name: "Briefings", href: "/dashboard/health-and-safety/briefings", icon: MessageSquare },
  { name: "Site Rules", href: "/dashboard/health-and-safety/site-rules", icon: ScrollText },
  { name: "COSHH", href: "/dashboard/health-and-safety/coshh", icon: FlaskConical },
  { name: "Safety Alerts", href: "/dashboard/health-and-safety/alerts", icon: AlertTriangle },
  { name: "Near Miss", href: "/dashboard/health-and-safety/near-miss", icon: AlertCircle },
];

export default function HealthAndSafetyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 p-1 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-600">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-600"
                  : "text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {tab.name}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
