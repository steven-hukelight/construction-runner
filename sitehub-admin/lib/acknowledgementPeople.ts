import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { roleDisplayName } from "@/lib/auth/roles";

/** Person shown on RAMS / briefing acknowledgement lists and exports. Deliberately excludes email/phone. */
export type AcknowledgementPerson = {
  name: string;
  role: string;
};

function firstText(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export async function loadAcknowledgementPeople(
  userIds: string[]
): Promise<Map<string, AcknowledgementPerson>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const people = new Map<string, AcknowledgementPerson>();
  if (ids.length === 0) return people;

  const [usersRes, profilesRes] = await Promise.all([
    supabaseAdmin.from("users").select("id, name, display_name, role").in("id", ids),
    supabaseAdmin.from("profiles").select("user_id, job_title, jobtitle").in("user_id", ids),
  ]);

  const jobTitles = new Map<string, string>();
  for (const p of profilesRes.data ?? []) {
    const title = firstText(p.job_title, p.jobtitle);
    if (p.user_id && title) jobTitles.set(String(p.user_id), title);
  }

  for (const u of usersRes.data ?? []) {
    const id = String(u.id);
    people.set(id, {
      name: firstText(u.display_name, u.name) ?? "Unnamed user",
      role: jobTitles.get(id) ?? roleDisplayName(u.role),
    });
  }
  return people;
}
