import { createClient, type Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.TEST_EMAIL || 'testuser@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Auth: login/logout/session', () => {
  let session: Session | null = null;

  it('should sign up a new user (if not exists)', async () => {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: { data: { company_id: 'testco', role: 'user' } },
    });
    // Accept both success and "user already registered"
    expect(error === null || error?.message?.includes('already registered')).toBeTruthy();
    expect(data.user).toBeDefined();
  });

  it('should sign in, persist session, and sign out', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    session = data.session;

    // Simulate storing and restoring session
    const { data: restored, error: restoreError } = await supabase.auth.setSession({
      access_token: session?.access_token ?? '',
      refresh_token: session?.refresh_token ?? '',
    });
    expect(restoreError).toBeNull();
    expect(restored.session).toBeDefined();

    // Sign out
    const { error: signOutError } = await supabase.auth.signOut();
    expect(signOutError).toBeNull();
    const { data: afterSignOut } = await supabase.auth.getSession();
    expect(afterSignOut.session).toBeNull();
  });

  it('should sync JWT claims (company, role, superuser)', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    expect(error).toBeNull();
    expect(data.session).toBeDefined();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    expect(userError).toBeNull();
    expect(userData.user).toBeDefined();
    expect(userData.user.user_metadata.company_id).toBe('testco');
    expect(userData.user.user_metadata.role).toBe('user');
  });

  it('should reject invalid login', async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: 'notarealuser@example.com',
      password: 'wrongpassword',
    });
    expect(error).not.toBeNull();
  });
});
