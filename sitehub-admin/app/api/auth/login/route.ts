import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * POST /api/auth/login
 * Validates email/password via Supabase Auth, then sets role/user_email/companyId cookies.
 * Used by mobile app (cookie-based auth) and any client that cannot use Supabase client SDK.
 */
export async function POST(req: Request) {
  try {
    if (!url || !anonKey) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email as string)?.trim();
    const password = body.password;
    const rememberMe = !!body.rememberMe;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabaseAuth = createClient(url, anonKey);
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const msg = authError.message || "Invalid email or password";
      const code = authError.status === 429 ? 429 : 401;
      return NextResponse.json({ error: msg }, { status: code });
    }

    const authUserId = authData?.user?.id;
    const sessionEmail = authData?.user?.email ?? email;

    if (!serviceKey) {
      return NextResponse.json({ error: "Server auth not configured" }, { status: 500 });
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let userRole: string | null = null;
    let isSuperuser = false;
    let userCompanyId: string | null = null;
    let foundInDb = false;
    let dbUserId: string | null = null;
    let dbUser: { id?: string; company_id: string | null; role: string | null } | null = null;

    try {
      if (sessionEmail) {
        const res = await supabaseAdmin
          .from("users")
          .select("id, company_id, role")
          .eq("email", sessionEmail)
          .maybeSingle();
        if (res.data) {
          dbUser = res.data;
          dbUserId = (res.data as { id?: string }).id ?? null;
        }
      }

      if (!dbUser && sessionEmail) {
        try {
          const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc("get_user_by_email", {
            search_email: sessionEmail,
          });
          if (!rpcError && rpcData) {
            const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
            if (row && (row as { role?: string }).role != null) {
              const r = row as { id?: string; company_id: string | null; role: string };
              dbUser = { company_id: r.company_id ?? null, role: r.role };
              dbUserId = r.id ?? null;
            }
          }
        } catch {
          // RPC may not exist
        }
      }

      if (!dbUser && sessionEmail) {
        const pattern = sessionEmail
          .replace(/\\/g, "\\\\")
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_");
        const res = await supabaseAdmin
          .from("users")
          .select("id, company_id, role")
          .ilike("email", pattern)
          .maybeSingle();
        if (res.data) {
          dbUser = res.data;
          dbUserId = (res.data as { id?: string }).id ?? null;
        }
      }

      if (!dbUser && authUserId) {
        const res = await supabaseAdmin
          .from("users")
          .select("id, company_id, role")
          .eq("id", authUserId)
          .maybeSingle();
        if (res.data) {
          dbUser = res.data;
          dbUserId = (res.data as { id?: string }).id ?? null;
        }
      }

      if (dbUser) {
        foundInDb = true;
        const r = (dbUser.role && String(dbUser.role).trim()) || null;
        userRole = r ?? "admin";
        isSuperuser = String(dbUser.role || "").toLowerCase() === "superuser";
        const raw = dbUser.company_id ? String(dbUser.company_id).trim() || null : null;
        userCompanyId = raw || null;
      }
    } catch (e) {
      console.warn("User lookup failed:", e);
    }

    if (!foundInDb) {
      return NextResponse.json(
        { error: "Your account is not yet set up. Please contact your administrator." },
        { status: 403 }
      );
    }

    // Superuser: skip company membership validation – they can select company in app
    if (isSuperuser) {
      userCompanyId = null; // Will be set by mobile via selectedCompanyId or web via impersonation
    }

    if (!userRole) userRole = "admin";
    const roleCookieValue = isSuperuser ? "superuser" : userRole;
    const maxAge = rememberMe ? 2592000 : 86400;

    const res = NextResponse.json({
      success: true,
      email: sessionEmail,
      role: roleCookieValue,
      companyId: isSuperuser ? null : userCompanyId,
    });

    const cookiePart = (name: string, value: string, age: number) =>
      `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${age}; SameSite=Lax`;
    res.headers.append("Set-Cookie", cookiePart("role", roleCookieValue, maxAge));
    res.headers.append("Set-Cookie", cookiePart("user_email", sessionEmail, maxAge));
    if (dbUserId) {
      res.headers.append("Set-Cookie", cookiePart("uid", dbUserId, maxAge));
    }
    if (isSuperuser) {
      res.headers.append("Set-Cookie", "companyId=; Path=/; Max-Age=0; SameSite=Lax");
    } else if (userCompanyId) {
      res.headers.append("Set-Cookie", cookiePart("companyId", userCompanyId, maxAge));
    } else {
      res.headers.append("Set-Cookie", "companyId=; Path=/; Max-Age=0; SameSite=Lax");
    }
    return res;
  } catch (e) {
    console.error("POST /api/auth/login failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
