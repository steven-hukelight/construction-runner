// supabaseAuthClient.ts
// Centralized Supabase Auth client for web and shared use
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export async function signUp({ email, password, ...meta }: { email: string, password: string, [key: string]: any }) {
  return supabase.auth.signUp({ email, password, options: { data: meta } })
}

export async function signIn({ email, password }: { email: string, password: string }) {
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

export function getSession() {
  return supabase.auth.getSession()
}

// Helper to get current user (from session)
export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

// JWT claim sync utility
export function getJwtClaims(session: any) {
  if (!session || !session.user) return {}
  return {
    company_id: session.user.user_metadata?.company_id,
    role: session.user.user_metadata?.role,
    superuser: session.user.user_metadata?.superuser,
  }
}
