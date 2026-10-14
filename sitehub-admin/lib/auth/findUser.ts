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

/** Auth user id for an email, even when public.users is missing. */
export async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data: rpcId, error: rpcError } = await supabaseAdmin.rpc("auth_user_id_by_email", {
    search_email: normalized,
  });
  if (!rpcError && rpcId) return String(rpcId);

  const dbUser = await findUserByIdOrEmail({ email: normalized });
  const dbId = dbUser?.id ? String(dbUser.id) : null;
  if (dbId) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(dbId);
    if (data?.user?.id) return data.user.id;
  }
  return dbId;
}

export async function authUserExists(id: string): Promise<boolean> {
  const trimmed = id.trim();
  if (!trimmed) return false;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(trimmed);
  return !error && !!data?.user?.id;
}
