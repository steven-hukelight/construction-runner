// useSupabaseAuth.ts
// React hook for Supabase Auth (web app)
import { useEffect, useState, useCallback } from 'react'
import { supabase, getCurrentUser, getSession, signIn, signOut, signUp, onAuthStateChange } from './supabaseAuthClient'

export function useSupabaseAuth() {
  const [user, setUser] = useState<any>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user || null)
      setLoading(false)
    })
    const { data: listener } = onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
    })
    return () => { listener?.subscription?.unsubscribe?.() }
  }, [])

  const signInCb = useCallback(signIn, [])
  const signUpCb = useCallback(signUp, [])
  const signOutCb = useCallback(signOut, [])

  return { user, session, loading, signIn: signInCb, signUp: signUpCb, signOut: signOutCb }
}
