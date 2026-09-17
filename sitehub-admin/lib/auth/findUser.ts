import { supabaseAdmin } from "@/lib/supabaseAdmin";

function emailIlikePattern(email: string): string {
  return email.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/** Auth stores emails lowercased; public.users may still have mixed case from signup. */
export async function findUserByIdOrEmail(opts: {
  id?: string | null;
  email?: string | null;
}): Promise<Record<string, unknown> | null> {
  const id = opts.id?.trim();
  if (id) {
    const { data } = await supabaseAdmin.from("users").select("*").eq("id", id).maybeSingle();
    if (data) return data as Record<string, unknown>;
  }

  const email = opts.email?.trim();
  if (!email) return null;

  const exact = await supabaseAdmin.from("users").select("*").eq("email", email).maybeSingle();
  if (exact.data) return exact.data as Record<string, unknown>;

  const { data } = await supabaseAdmin
    .from("users")
    .select("*")
    .ilike("email", emailIlikePattern(email))
    .maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}
