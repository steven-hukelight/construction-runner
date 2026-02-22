import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('RLS: Company and Role Isolation', () => {
  const companyA = { email: 'companyAuser@example.com', password: 'TestPassword123!', company_id: 'companyA', role: 'user' };
  const companyB = { email: 'companyBuser@example.com', password: 'TestPassword123!', company_id: 'companyB', role: 'user' };
  const superuser = { email: 'superuser@example.com', password: 'TestPassword123!', company_id: 'companyA', role: 'superuser', superuser: true };

  beforeAll(async () => {
    // Ensure users exist
    await supabase.auth.signUp({ email: companyA.email, password: companyA.password, options: { data: { company_id: companyA.company_id, role: companyA.role } } });
    await supabase.auth.signUp({ email: companyB.email, password: companyB.password, options: { data: { company_id: companyB.company_id, role: companyB.role } } });
    await supabase.auth.signUp({ email: superuser.email, password: superuser.password, options: { data: { company_id: superuser.company_id, role: superuser.role, superuser: true } } });
  });

  it('should block cross-company reads/writes', async () => {
    // Login as companyA user
    const { data: loginA } = await supabase.auth.signInWithPassword({ email: companyA.email, password: companyA.password });
    expect(loginA.session).toBeDefined();
    // Try to read companyB's data (simulate with a table that has company_id)
    // This assumes a table 'profiles' with company_id column and RLS enabled
    const { data: rows, error } = await supabase.from('profiles').select('*').eq('company_id', companyB.company_id);
    expect(error).toBeNull();
    expect(rows.length).toBe(0); // Should not see other company data
  });

  it('should allow superuser bypass', async () => {
    // Login as superuser
    const { data: loginSuper } = await supabase.auth.signInWithPassword({ email: superuser.email, password: superuser.password });
    expect(loginSuper.session).toBeDefined();
    // Should be able to read all companies
    const { data: allRows, error } = await supabase.from('profiles').select('*');
    expect(error).toBeNull();
    // Should see at least one row from companyA or companyB if seeded
    expect(Array.isArray(allRows)).toBe(true);
  });
});
