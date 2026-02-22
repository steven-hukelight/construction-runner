/**
 * @deprecated Firebase has been removed. Use Supabase client instead.
 * Import { supabase } from "@/supabase/auth/client" or "@/lib/supabaseClient".
 */
import { supabase } from "@/supabase/auth/client";

export function initFirebase() {
  return {
    auth: {
      get currentUser() {
        return supabase.auth.getUser().then(({ data }) => data.user) as any;
      },
    },
    db: null as any,
    storage: supabase.storage,
    app: null as any,
  };
}

export default initFirebase;
