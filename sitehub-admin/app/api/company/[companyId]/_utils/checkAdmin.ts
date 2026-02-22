import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function checkAdminOrSuperuser(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return false;
    const role = (user.user_metadata?.role ?? user.app_metadata?.role) as string | undefined;
    const superuser = (user.user_metadata?.superuser ?? user.app_metadata?.superuser) as boolean | undefined;
    const roleLower = (role ?? "").toLowerCase();
    return roleLower === "admin" || roleLower === "sub_admin" || superuser === true;
  } catch {
    return false;
  }
}
