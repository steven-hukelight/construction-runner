// supabase/auth/jwt_claims.ts
// JWT claims spec for Supabase Auth → RLS

export interface SupabaseJwtClaims {
  sub: string; // user id (uuid)
  user_id: string; // alias for sub
  company_id: string; // company id (uuid)
  role: string; // e.g. 'admin', 'supervisor', 'operative'
  superuser: boolean; // true if superuser
  // ...other standard claims (iat, exp, etc.)
}

// Example: what RLS expects
// auth.jwt()->>'company_id'
// auth.jwt()->>'role'
// auth.jwt()->>'superuser'

export const exampleClaims: SupabaseJwtClaims = {
  sub: 'uuid-user-id',
  user_id: 'uuid-user-id',
  company_id: 'uuid-company-id',
  role: 'admin',
  superuser: false,
};
