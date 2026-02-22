/**
 * Integration test helpers – auth context, request builders.
 */
import { createClient } from "@supabase/supabase-js";
import { setMockCookies, clearMockCookies } from "../regression/helpers";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthContext {
  uid: string;
  user_email: string;
  companyId: string;
  role: string;
}

let _supabaseAnon: SupabaseClient | null = null;

function getSupabaseAnon(): SupabaseClient {
  if (_supabaseAnon) return _supabaseAnon;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY required for integration");
  _supabaseAnon = createClient(url, key);
  return _supabaseAnon;
}

/**
 * Log in with TEST_EMAIL/TEST_PASSWORD and resolve user's company_id and role from users table.
 * Uses supabaseAdmin (service role) to read users – must be called when hasApiIntegrationEnv().
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = getSupabaseAnon();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL!,
    password: process.env.TEST_PASSWORD!,
  });
  if (error) throw new Error(`Integration login failed: ${error.message}`);
  const user = authData.user;
  if (!user) throw new Error("No user returned from login");

  const email = user.email ?? process.env.TEST_EMAIL!;
  const uid = user.id;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  let companyId = String(meta.company_id ?? meta.companyId ?? "").trim();
  let role = String(meta.role ?? "user").toLowerCase();

  if (!companyId) {
    const { supabaseAdmin } = await import("@/lib/supabaseAdmin");
    const { data: profile } = await supabaseAdmin
      .from("users")
      .select("company_id, role")
      .eq("id", uid)
      .maybeSingle();
    if (profile) {
      companyId = String((profile as { company_id?: string }).company_id ?? "").trim();
      role = String((profile as { role?: string }).role ?? "user").toLowerCase();
    }
    if (!companyId) {
      const { data: firstCompany } = await supabaseAdmin
        .from("companies")
        .select("id")
        .limit(1)
        .maybeSingle();
      companyId = firstCompany ? String((firstCompany as { id: string }).id).trim() : "";
    }
  }

  return { uid, user_email: email, companyId, role: role || "user" };
}

/**
 * Apply auth context to mock cookies so API routes see the logged-in user.
 */
export function applyAuthContext(ctx: AuthContext) {
  clearMockCookies();
  setMockCookies({
    uid: ctx.uid,
    user_email: ctx.user_email,
    companyId: ctx.companyId || "",
    role: ctx.role || "admin",
  });
}

/**
 * Create a JSON request for API testing.
 */
export function jsonRequest(
  url: string,
  init: { method?: string; body?: object; headers?: Record<string, string> } = {}
) {
  const { method = "GET", body, headers = {} } = init;
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
