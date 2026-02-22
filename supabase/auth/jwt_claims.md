// jwt_claims.md

# Supabase Auth JWT Claims Design

## JWT Payload Shape

- `sub` (user id, string)
- `company_id` (string or null)
- `role` (string, e.g. 'admin', 'supervisor', 'operative', etc)
- `superuser` (boolean or string)

## Example JWT Payload

```
{
  "sub": "user-uuid-123",
  "company_id": "company-uuid-456",
  "role": "admin",
  "superuser": false,
  "email": "user@example.com",
  ...other default claims
}
```

## RLS Model Requirements

- RLS expects:
  - `auth.jwt()->>'company_id'`
  - `auth.jwt()->>'role'`
  - `auth.jwt()->>'superuser'`
- These must be present in every JWT for correct access control.

## Mapping
- `sub` → `users.id`
- `company_id` → `users.company_id`
- `role` → `users.role`
- `superuser` → `users.superuser`

## Notes
- Claims must be kept in sync with the `users` table.
- Use triggers or Edge Function to update claims if user data changes.
