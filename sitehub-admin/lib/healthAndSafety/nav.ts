export const HEALTH_AND_SAFETY_HREF = "/dashboard/health-and-safety/rams";

export const HEALTH_AND_SAFETY_GROUP_ORDER = ["Documents", "Access", "Live risk", "Evidence"] as const;

export type HealthAndSafetyGroupName = (typeof HEALTH_AND_SAFETY_GROUP_ORDER)[number];

export const HEALTH_AND_SAFETY_TABS = [
  {
    name: "RAMS",
    href: "/dashboard/health-and-safety/rams",
    group: "Documents",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Briefings",
    href: "/dashboard/health-and-safety/briefings",
    group: "Documents",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "COSHH",
    href: "/dashboard/health-and-safety/coshh",
    group: "Documents",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Site rules",
    href: "/dashboard/health-and-safety/site-rules",
    group: "Documents",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Induction safety",
    href: "/dashboard/health-and-safety/induction-safety",
    group: "Access",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Training",
    href: "/dashboard/health-and-safety/training",
    group: "Access",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Permits",
    href: "/dashboard/health-and-safety/permits",
    group: "Access",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Alerts",
    href: "/dashboard/health-and-safety/alerts",
    group: "Live risk",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Alarms",
    href: "/dashboard/health-and-safety/alarms",
    group: "Live risk",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
  {
    name: "Near miss",
    href: "/dashboard/health-and-safety/near-miss",
    group: "Live risk",
    showNearMissCount: true,
    showAutoPausedCount: false,
  },
  {
    name: "Quiz results",
    href: "/dashboard/health-and-safety/questions",
    group: "Evidence",
    showNearMissCount: false,
    showAutoPausedCount: true,
  },
  {
    name: "Client pack",
    href: "/dashboard/health-and-safety/evidence",
    group: "Evidence",
    showNearMissCount: false,
    showAutoPausedCount: false,
  },
] as const;

export type HealthAndSafetyTab = (typeof HEALTH_AND_SAFETY_TABS)[number];

export function healthAndSafetyTabsForRole(canViewNearMiss: boolean): HealthAndSafetyTab[] {
  if (canViewNearMiss) return [...HEALTH_AND_SAFETY_TABS];
  return HEALTH_AND_SAFETY_TABS.filter((tab) => tab.href !== "/dashboard/health-and-safety/near-miss");
}

export function healthAndSafetyGroupsForRole(canViewNearMiss: boolean) {
  const tabs = healthAndSafetyTabsForRole(canViewNearMiss);
  return HEALTH_AND_SAFETY_GROUP_ORDER.map((name) => ({
    name,
    tabs: tabs.filter((tab) => tab.group === name),
  })).filter((group) => group.tabs.length > 0);
}

export function isHealthAndSafetyPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.startsWith("/dashboard/health-and-safety"));
}

export function isHealthAndSafetyTabActive(pathname: string | null | undefined, href: string): boolean {
  return pathname === href || Boolean(pathname?.startsWith(`${href}/`));
}
