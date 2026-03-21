"use client";

/**
 * Color-coded badge for user roles to visually differentiate at a glance.
 */
const ROLE_STYLES: Record<string, { bg: string; text: string; border?: string }> = {
  superuser: { bg: "bg-violet-100 dark:bg-violet-900/50", text: "text-violet-800 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  admin: { bg: "bg-blue-100 dark:bg-blue-900/50", text: "text-blue-800 dark:text-blue-300", border: "border-blue-200 dark:border-blue-800" },
  sub_admin: { bg: "bg-indigo-100 dark:bg-indigo-900/50", text: "text-indigo-800 dark:text-indigo-300", border: "border-indigo-200 dark:border-indigo-800" },
  supervisor: { bg: "bg-amber-100 dark:bg-amber-900/50", text: "text-amber-800 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  operative: { bg: "bg-emerald-100 dark:bg-emerald-900/50", text: "text-emerald-800 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  viewer: { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-slate-300", border: "border-gray-200 dark:border-slate-600" },
};

const defaultStyle = { bg: "bg-gray-100 dark:bg-slate-700", text: "text-gray-700 dark:text-slate-300", border: "border-gray-200 dark:border-slate-600" };

interface RoleBadgeProps {
  role: string | null | undefined;
  className?: string;
}

export default function RoleBadge({ role, className = "" }: RoleBadgeProps) {
  const r = (role ?? "—").toString().trim() || "—";
  const display = r === "—" ? "—" : r;
  const roleKey = r === "—" ? "" : r.toLowerCase();
  const style = ROLE_STYLES[roleKey] ?? defaultStyle;

  return (
    <span
      className={`role-badge inline-flex px-2 py-0.5 text-xs font-medium rounded-md border ${style.bg} ${style.text} ${style.border ?? ""} ${className}`}
      title={display}
    >
      {display}
    </span>
  );
}
