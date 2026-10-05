/**
 * Role colour is identity, not status. Never red, amber, or green.
 *
 * `admin` is shown as Super Admin and uses violet.
 * Superuser uses the same violet. There is no separate Admin role beneath Super Admin,
 * so the indigo swatch is not applied.
 */

export const ROLE_CHIP_CLASS: Record<string, string> = {
  operative: "bg-slate-100 text-slate-700",
  supervisor: "bg-cyan-100 text-cyan-800",
  site_admin: "bg-blue-100 text-blue-800",
  /** Shown as Super Admin. */
  admin: "bg-violet-100 text-violet-800",
  superuser: "bg-violet-100 text-violet-800",
  sub_admin: "bg-fuchsia-100 text-fuchsia-800",
};

/** Solid fill for initials avatars. Same hues as chips, stronger so they read on white cards. */
export const ROLE_AVATAR_CLASS: Record<string, string> = {
  operative: "bg-slate-600 text-white",
  supervisor: "bg-cyan-600 text-white",
  site_admin: "bg-blue-600 text-white",
  admin: "bg-violet-600 text-white",
  superuser: "bg-violet-600 text-white",
  sub_admin: "bg-fuchsia-600 text-white",
};

/** Lucide / initials tile in table name cells when there is no role. */
export const TABLE_ICON_TILE = "bg-blue-600 text-white";

/** Highest privilege first. Unknown roles sort last. */
const ROLE_PRIVILEGE: Record<string, number> = {
  superuser: 0,
  admin: 1,
  site_admin: 2,
  supervisor: 3,
  sub_admin: 4,
  operative: 5,
};

export function roleStyleKey(role: string | null | undefined): string {
  return (role ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");
}

export function roleChipClass(role: string | null | undefined): string {
  const key = roleStyleKey(role);
  return ROLE_CHIP_CLASS[key] ?? "bg-slate-100 text-slate-700";
}

export function roleAvatarClass(role: string | null | undefined): string {
  const key = roleStyleKey(role);
  return ROLE_AVATAR_CLASS[key] ?? TABLE_ICON_TILE;
}

export function rolePrivilege(role: string | null | undefined): number {
  const key = roleStyleKey(role);
  return ROLE_PRIVILEGE[key] ?? 99;
}
