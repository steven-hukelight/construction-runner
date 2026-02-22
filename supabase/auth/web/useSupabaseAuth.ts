// supabase/auth/web/useSupabaseAuth.ts
// React hook for Supabase Auth (web integration)

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../client'
import type { Session, User } from '@supabase/supabase-js'

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
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
