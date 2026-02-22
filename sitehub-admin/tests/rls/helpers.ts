/**
 * Shared helpers for RLS integration tests.
 * Requires SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const COMPANY_A_ID = "rls-test-company-a";
export const COMPANY_B_ID = "rls-test-company-b";
export const SITE_A_ID = "rls-test-site-a";
export const SITE_B_ID = "rls-test-site-b";

const TEST_PASSWORD = "TestRLSPassword123!";

export interface RlsTestUser {
  email: string;
  password: string;
  companyId: string;
  role: string;
  superuser?: boolean;
  authId?: string;
}

export const USER_A: RlsTestUser = {
  email: "rls-user-a@rls-test.example.com",
  password: TEST_PASSWORD,
  companyId: COMPANY_A_ID,
  role: "admin",
};

export const USER_B: RlsTestUser = {
  email: "rls-user-b@rls-test.example.com",
  password: TEST_PASSWORD,
  companyId: COMPANY_B_ID,
  role: "admin",
};

export const SUPERUSER: RlsTestUser = {
  email: "rls-superuser@rls-test.example.com",
  password: TEST_PASSWORD,
  companyId: COMPANY_A_ID,
  role: "superuser",
  superuser: true,
};

export function getServiceClient(): SupabaseClient | null {
  if (!serviceKey || !url) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getAnonClient(): SupabaseClient {
  return createClient(url, anonKey);
}

export async function seedRlsTestData(service: SupabaseClient): Promise<void> {
  // 1. Create companies
  await service.from("companies").upsert(
    [
      { id: COMPANY_A_ID, name: "RLS Test Company A" },
      { id: COMPANY_B_ID, name: "RLS Test Company B" },
    ],
    { onConflict: "id" }
  );

  // 2. Create auth users + public.users via Admin API
  const createAuthAndUser = async (u: RlsTestUser): Promise<string> => {
    const { data: authUser, error: authErr } = await service.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: {
        company_id: u.companyId,
        role: u.role,
        superuser: u.superuser ?? false,
      },
    });
    if (authErr) {
      // May already exist from previous run; try sign-in to get id
      const { data: existing } = await service.auth.admin.listUsers();
      const found = existing?.users?.find((x) => x.email === u.email);
      if (found) return found.id;
      throw new Error(`Failed to create auth user ${u.email}: ${authErr.message}`);
    }
    const authId = authUser.user.id;

    // 3. Insert public.users row (id = auth.uid for RLS)
    // Note: superuser column may not exist; use role for superuser detection
    const { error: userErr } = await service.from("users").upsert(
      {
        id: authId,
        company_id: u.companyId,
        email: u.email,
        role: u.role,
      },
      { onConflict: "id" }
    );
    if (userErr) {
      // Ignore if unique constraint (user may exist)
      if (userErr.code !== "23505") throw new Error(`Failed to create user ${u.email}: ${userErr.message}`);
    }
    return authId;
  };

  await createAuthAndUser(USER_A);
  await createAuthAndUser(USER_B);
  await createAuthAndUser(SUPERUSER);

  // 4. Sites for each company
  await service.from("sites").upsert(
    [
      { id: SITE_A_ID, company_id: COMPANY_A_ID, name: "RLS Site A", active: true },
      { id: SITE_B_ID, company_id: COMPANY_B_ID, name: "RLS Site B", active: true },
    ],
    { onConflict: "id" }
  );
}

export async function getClientAsUser(user: RlsTestUser): Promise<SupabaseClient> {
  const client = getAnonClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password,
  });
  if (error) throw new Error(`Sign in failed for ${user.email}: ${error.message}`);
  if (!data.session) throw new Error(`No session for ${user.email}`);
  return client;
}
