/**
 * Shared login handler for POST /api/auth/login and /api/admin/auth/login.
 * Validates email/password via Supabase Auth, then returns cookie headers.
 */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { logAuthEvent, getClientIp, getUserAgent } from "./authAudit";
import { createSession } from "./sessions";
import { checkSuspiciousLogin } from "./suspiciousLogin";
import {
  COOKIE_MAX_AGE_DEFAULT,
  COOKIE_MAX_AGE_MOBILE_APP,
  COOKIE_MAX_AGE_REMEMBER,
} from "./securityConfig";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function handleLoginPost(req: Request): Promise<NextResponse> {
  const ip = getClientIp(req);
  const userAgent = getUserAgent(req);

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
      await logAuthEvent({
        userId: null,
        emailAttempted: email,
        ipAddress: ip,
        userAgent,
        outcome: "failure",
      });
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
    let dbUser: { id?: string; company_id: string | null; role: string | null; approved?: boolean | null } | null = null;

    try {
      if (sessionEmail) {
        const res = await supabaseAdmin
          .from("users")
          .select("id, company_id, role, approved")
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
              const r = row as { id?: string; company_id: string | null; role: string; approved?: boolean | null };
              dbUser = { company_id: r.company_id ?? null, role: r.role, approved: r.approved ?? null };
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
          .select("id, company_id, role, approved")
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
          .select("id, company_id, role, approved")
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
      await logAuthEvent({
        userId: authUserId ?? null,
        emailAttempted: sessionEmail,
        ipAddress: ip,
        userAgent,
        outcome: "failure",
      });
      return NextResponse.json(
        { error: "Your account is not yet set up. Please contact your administrator." },
        { status: 403 }
      );
    }

    if (!isSuperuser && dbUser?.approved === false) {
      await logAuthEvent({
        userId: dbUserId ?? null,
        emailAttempted: sessionEmail,
        ipAddress: ip,
        userAgent,
        outcome: "failure",
      });
      return NextResponse.json(
        { error: "Your account is pending approval. An administrator must approve it before you can sign in." },
        { status: 403 }
      );
    }

    const clientHeader = req.headers.get("x-client")?.toLowerCase().trim();
    const isMobileApp = clientHeader === "mobile";
    const roleLower = (userRole || "").toLowerCase();
    if (roleLower === "operative" && !isMobileApp) {
      await logAuthEvent({
        userId: dbUserId ?? null,
        emailAttempted: sessionEmail,
        ipAddress: ip,
        userAgent,
        outcome: "failure",
      });
      return NextResponse.json(
        { error: "Operative web login is a future feature. Please use the mobile app." },
        { status: 403 }
      );
    }

    if (isSuperuser) {
      userCompanyId = null;
    }

    if (!userRole) userRole = "admin";
    const roleCookieValue = isSuperuser ? "superuser" : userRole;
    const maxAge = isMobileApp
      ? COOKIE_MAX_AGE_MOBILE_APP
      : rememberMe
        ? COOKIE_MAX_AGE_REMEMBER
        : COOKIE_MAX_AGE_DEFAULT;

    const deviceType = clientHeader === "mobile" ? "mobile" : "web";

    let suspicious = false;
    let sessionId: string | null = null;
    let sessionStartedAt: number | null = null;

    if (dbUserId) {
      try {
        const sus = await checkSuspiciousLogin({
          userId: dbUserId,
          ipAddress: ip,
          userAgent,
          deviceType,
        });
        suspicious = sus.suspicious;
      } catch {
        // Non-fatal
      }

      try {
        const sess = await createSession({
          userId: dbUserId,
          deviceType,
          ipAddress: ip,
          userAgent,
        });
        sessionId = sess.id;
        sessionStartedAt = sess.createdAt;
      } catch (e) {
        console.warn("Session create failed:", e);
      }
    }

    await logAuthEvent({
      userId: dbUserId ?? null,
      emailAttempted: sessionEmail,
      ipAddress: ip,
      userAgent,
      outcome: "success",
    });

    const res = NextResponse.json({
      success: true,
      email: sessionEmail,
      role: roleCookieValue,
      companyId: isSuperuser ? null : userCompanyId,
      suspicious,
    });

    const cookiePart = (name: string, value: string, age: number) =>
      `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${age}; SameSite=Lax`;
    res.headers.append("Set-Cookie", cookiePart("role", roleCookieValue, maxAge));
    res.headers.append("Set-Cookie", cookiePart("user_email", sessionEmail, maxAge));
    if (dbUserId) {
      res.headers.append("Set-Cookie", cookiePart("uid", dbUserId, maxAge));
    }
    if (sessionId && sessionStartedAt !== null) {
      res.headers.append("Set-Cookie", cookiePart("session_id", sessionId, maxAge));
      res.headers.append("Set-Cookie", cookiePart("session_started_at", String(Math.floor(sessionStartedAt / 1000)), maxAge));
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
    console.error("Login handler failed:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
