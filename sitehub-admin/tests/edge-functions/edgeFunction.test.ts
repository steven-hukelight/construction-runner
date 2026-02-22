import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Edge Functions', () => {
  it('should call handler and enforce auth', async () => {
    // Example: /functions/v1/your-function (replace with real function)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    });
    expect(error).toBeNull();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/your-function`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ test: true }),
    });
    expect(res.status).toBe(200);
    // TODO: Assert response body as needed
  });
  it('should block unauthenticated requests', async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/your-function`, {
      method: 'POST',
      body: JSON.stringify({ test: true }),
    });
    expect(res.status).toBe(401);
  });
});
