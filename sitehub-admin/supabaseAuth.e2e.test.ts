// Automated Supabase Auth feature parity and session persistence test
// Run with: npx jest supabaseAuth.e2e.test.ts

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'testuser@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Supabase Auth Feature Parity & Session Persistence', () => {
  let session: any;

  it('signs up a new user', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: { data: { company_id: 'testco', role: 'user' } },
    });
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
  });

  it('signs in and returns a session', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    session = data.session;
  });

  it('persists session and restores after reload', async () => {
    // Simulate storing and restoring session
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
  });

  it('refreshes session token', async () => {
    const { data, error } = await supabase.auth.refreshSession();
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
  });

  it('gets user metadata and JWT claims', async () => {
    const { data, error } = await supabase.auth.getUser();
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.user.user_metadata.company_id).toBe('testco');
    expect(data.user.user_metadata.role).toBe('user');
  });

  it('signs out and clears session', async () => {
    const { error } = await supabase.auth.signOut();
    expect(error).toBeNull();
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});
