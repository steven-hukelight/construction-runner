/**
 * Integration test environment checks.
 * Tests run ONLY when all required env vars are present; otherwise skipped gracefully.
 */
const required = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "TEST_EMAIL",
  "TEST_PASSWORD",
] as const;

/** Required for auth-only tests (Supabase Auth) */
export function hasIntegrationEnv(): boolean {
  const anon =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;
  return !!(url && anon && email && password);
}

/** Required for API route tests (needs supabaseAdmin / service role) */
export function hasApiIntegrationEnv(): boolean {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return hasIntegrationEnv() && typeof serviceKey === "string" && serviceKey.trim().length > 0;
}
