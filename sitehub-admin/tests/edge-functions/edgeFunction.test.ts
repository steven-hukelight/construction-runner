import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EDGE_FUNCTION_NAME = process.env.EDGE_FUNCTION_NAME;
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const hasEnv = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  EDGE_FUNCTION_NAME &&
  TEST_EMAIL &&
  TEST_PASSWORD,
);

const supabase = hasEnv ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const describeIfConfigured = hasEnv ? describe : describe.skip;

describeIfConfigured('Edge Functions', () => {
  it('allows authenticated invocation', async () => {
    const { data, error } = await supabase!.auth.signInWithPassword({
      email: TEST_EMAIL!,
      password: TEST_PASSWORD!,
    });
    expect(error).toBeNull();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ test: true }),
    });

    expect(res.ok).toBe(true);
    const body = await res.json().catch(() => null);
    expect(body).not.toBeNull();
  });

  it('blocks unauthenticated requests', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${EDGE_FUNCTION_NAME}`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });
    expect(res.status).toBe(401);
  });
});
