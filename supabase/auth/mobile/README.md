// supabase/auth/mobile/README.md

# Mobile Integration: Supabase Auth (Flutter)

- Use `SupabaseAuthClient` for all auth actions
- Centralizes sign up, sign in, sign out, session
- Replace Firebase Auth usage with this client
- Claims (company_id, role, superuser) are available in JWT
- Use dual mode toggle for migration period

## Example Usage
```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import 'supabaseAuthClient.dart';

final auth = SupabaseAuthClient();

// Sign up
await auth.signUp('email@example.com', 'password');

// Sign in
await auth.signIn('email@example.com', 'password');

// Sign out
await auth.signOut();

// Listen to auth state changes
final sub = auth.onAuthStateChange.listen((event) {
  // ...
});
```
