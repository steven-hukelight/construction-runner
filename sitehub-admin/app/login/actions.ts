"use server";

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function setUserCookies(
  email: string,
  rememberMe: boolean,
  authUserId?: string
) {
  const emailTrimmed = (email || "").trim();
  if (!emailTrimmed && !authUserId) return { role: null, companyId: null };

  const maxAge = rememberMe ? 2592000 : 86400; // 30 days or 1 day

  let userRole: string | null = null;
  let isSuperuser = false;
  let userCompanyId: string | null = null;
  let foundInDb = false;
  let dbUser: { company_id: string | null; role: string | null } | null = null;

  try {
    // 1. Exact email match
    if (emailTrimmed) {
      const res = await supabaseAdmin
        .from("users")
        .select("company_id, role")
        .eq("email", emailTrimmed)
        .maybeSingle();
      if (res.data) dbUser = res.data;
    }

    // 2. Case-insensitive: RPC (preferred) or ilike fallback
    if (!dbUser && emailTrimmed) {
      const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_user_by_email", {
        search_email: emailTrimmed,
      });
      if (!rpcError && rpcData) {
        const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        if (row && (row as { role?: string }).role != null) {
          const r = row as { company_id: string | null; role: string };
          dbUser = { company_id: r.company_id ?? null, role: r.role };
        }
      }
    }

    // 3. Case-insensitive ilike fallback (when RPC not available)
    if (!dbUser && emailTrimmed) {
      const pattern = emailTrimmed
        .replace(/\\/g, "\\\\")
        .replace(/%/g, "\\%")
        .replace(/_/g, "\\_");
      const res = await supabaseAdmin
        .from("users")
        .select("company_id, role")
        .ilike("email", pattern)
        .maybeSingle();
      if (res.data) dbUser = res.data;
    }

    // 4. Auth user id (when public.users.id = auth.users.id)
    if (!dbUser && authUserId) {
      const res = await supabaseAdmin
        .from("users")
        .select("company_id, role")
        .eq("id", authUserId)
        .maybeSingle();
      if (res.data) dbUser = res.data;
    }

    if (dbUser) {
      foundInDb = true;
      const r = (dbUser.role && String(dbUser.role).trim()) || null;
      userRole = r ?? "admin"; // fallback when user in DB but role is empty
      isSuperuser = String(dbUser.role || "").toLowerCase() === "superuser";

      const raw = dbUser.company_id ? String(dbUser.company_id).trim() || null : null;
      userCompanyId = raw || null;
    }
  } catch (e) {
    console.warn("Could not fetch user from users table:", e);
  }

  // Never set cookies when user not in public.users – prevents wrong role
  if (!foundInDb) return { role: null, companyId: null };
  if (!userRole) userRole = "admin"; // user in DB but role column empty

  const cookieStore = await cookies();
  const roleCookieValue = isSuperuser ? "superuser" : userRole;

  cookieStore.set("role", roleCookieValue, {
    path: "/",
    maxAge,
    httpOnly: false,
    sameSite: "lax",
  });

  cookieStore.set("user_email", email, {
    path: "/",
    maxAge,
    httpOnly: false,
    sameSite: "lax",
  });

  if (isSuperuser) {
    cookieStore.set("companyId", "", { path: "/", maxAge: 0 });
  } else if (userCompanyId) {
    cookieStore.set("companyId", userCompanyId, {
      path: "/",
      maxAge,
      httpOnly: false,
      sameSite: "lax",
    });
  } else {
    cookieStore.set("companyId", "", { path: "/", maxAge: 0 });
  }

  return {
    role: roleCookieValue,
    companyId: isSuperuser ? null : userCompanyId,
  };
}
