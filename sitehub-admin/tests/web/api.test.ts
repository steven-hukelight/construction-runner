import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Web API Routes', () => {
  it('should allow authorized access', async () => {
    // Example: /api/me route (replace with real route)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_EMAIL,
      password: process.env.TEST_PASSWORD,
    });
    expect(error).toBeNull();
    const res = await fetch('http://localhost:3000/api/me', {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe(process.env.TEST_EMAIL);
  });
  it('should block unauthorized access', async () => {
    const res = await fetch('http://localhost:3000/api/me');
    expect(res.status).toBe(401);
  });
});
