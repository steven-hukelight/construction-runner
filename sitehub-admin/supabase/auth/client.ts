import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export { supabase };

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function onAuthStateChange(callback: (event: string, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export function getCurrentUser(): Promise<User | null> {
  return supabase.auth.getUser().then(({ data }) => data.user);
}

export function getSession(): Promise<Session | null> {
  return supabase.auth.getSession().then(({ data }) => data.session);
}
