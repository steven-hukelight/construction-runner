"use server";

import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSession } from "@/lib/sessions";
import {
  COOKIE_MAX_AGE_DEFAULT,
  COOKIE_MAX_AGE_REMEMBER,
} from "@/lib/securityConfig";

export async function setUserCookies(
  email: string,
  rememberMe: boolean,
  authUserId?: string
) {
  const emailTrimmed = (email || "").trim();
  if (!emailTrimmed && !authUserId) return { role: null, companyId: null };

  const maxAge = rememberMe ? COOKIE_MAX_AGE_REMEMBER : COOKIE_MAX_AGE_DEFAULT;

  let userRole: string | null = null;
  let isSuperuser = false;
  let userCompanyId: string | null = null;
  let dbUserId: string | null = null;
  let foundInDb = false;
  let dbUser: { id?: string; company_id: string | null; role: string | null; approved?: boolean | null } | null = null;

  try {
    // 1. Exact email match
    if (emailTrimmed) {
      const res = await supabaseAdmin
        .from("users")
        .select("id, company_id, role, approved")
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
          const r = row as { id?: string; company_id: string | null; role: string; approved?: boolean | null };
          dbUser = { id: r.id, company_id: r.company_id ?? null, role: r.role, approved: r.approved ?? null };
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
        .select("id, company_id, role, approved")
        .ilike("email", pattern)
        .maybeSingle();
      if (res.data) dbUser = res.data;
    }

    // 4. Auth user id (when public.users.id = auth.users.id)
    if (!dbUser && authUserId) {
      const res = await supabaseAdmin
        .from("users")
        .select("id, company_id, role, approved")
        .eq("id", authUserId)
        .maybeSingle();
      if (res.data) dbUser = res.data;
    }

    if (dbUser) {
      foundInDb = true;
      dbUserId = (dbUser as { id?: string }).id ?? authUserId ?? null;
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

  if (!isSuperuser && dbUser?.approved === false) {
    return { role: null, companyId: null, pendingApproval: true as const };
  }

  // Operative web login is a future feature – block operatives from web access
  const roleLower = (userRole || "").toLowerCase();
  if (roleLower === "operative") {
    return { role: null, companyId: null, restricted: "operative" as const };
  }

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

  if (dbUserId) {
    cookieStore.set("uid", dbUserId, {
      path: "/",
      maxAge,
      httpOnly: false,
      sameSite: "lax",
    });
  }

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

  if (dbUserId) {
    try {
      const hdrs = await headers();
      const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "unknown";
      const userAgent = hdrs.get("user-agent") || "";
      const sess = await createSession({
        userId: dbUserId,
        deviceType: "web",
        ipAddress: ip,
        userAgent,
      });
      cookieStore.set("session_id", sess.id, { path: "/", maxAge, httpOnly: false, sameSite: "lax" });
      cookieStore.set("session_started_at", String(Math.floor(sess.createdAt / 1000)), {
        path: "/",
        maxAge,
        httpOnly: false,
        sameSite: "lax",
      });
    } catch (e) {
      console.warn("Session create failed in setUserCookies:", e);
    }
  }

  return {
    role: roleCookieValue,
    companyId: isSuperuser ? null : userCompanyId,
  };
}
