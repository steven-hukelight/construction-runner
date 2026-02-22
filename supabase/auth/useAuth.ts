// supabase/auth/useAuth.ts
// React hook for centralized Supabase Auth state

import { useEffect, useState, useCallback } from 'react'
import { supabase, getCurrentUser, getSession } from './client'
import type { Session, User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then((sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
    })
    return () => { listener?.subscription.unsubscribe() }
  }, [])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  return { user, session, loading, signOut }
}
