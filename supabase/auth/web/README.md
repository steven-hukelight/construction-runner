// supabase/auth/web/README.md

# Web Integration: Supabase Auth

- Use `useSupabaseAuth()` for React apps (see useSupabaseAuth.ts)
- Centralizes session, user, sign out
- Replace Firebase Auth usage with this hook
- Claims (company_id, role, superuser) are available in JWT
// Removed: dual auth mode toggle (migration complete)

## Example Usage
```tsx
import { useSupabaseAuth } from 'supabase/auth/web/useSupabaseAuth'

function MyComponent() {
  const { user, session, loading, signOut } = useSupabaseAuth()
  // ...
}
```
