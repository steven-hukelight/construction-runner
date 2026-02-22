export const roles = {
  admin: ["sites", "rams", "users"],
  manager: ["sites", "rams"],
  viewer: ["sites"],
};

export function canAccess(role: string, module: string) {
  return roles[role as keyof typeof roles]?.includes(module);
}
