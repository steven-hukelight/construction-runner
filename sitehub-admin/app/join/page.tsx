import { redirect } from "next/navigation";

export default async function JoinPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await Promise.resolve(searchParams ?? {});
  const query = new URLSearchParams();
  query.set("tab", "subcontractor");
  for (const key of ["code", "name", "company"] as const) {
    const raw = params[key];
    const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (value) query.set(key, value);
  }
  redirect(`/register?${query.toString()}`);
}
