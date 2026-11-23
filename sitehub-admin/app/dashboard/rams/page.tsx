import { redirect } from "next/navigation";

/**
 * Legacy route: /dashboard/rams redirects to Health & safety > RAMS
 * for backward compatibility with bookmarks and links.
 */
export default async function LegacyRAMSPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
  }
  const suffix = query.toString();
  redirect(`/dashboard/health-and-safety/rams${suffix ? `?${suffix}` : ""}`);
}
