// supabase/auth/edge/claims_sync.ts
// Edge Function to sync JWT claims with users table (Supabase Deno function)
// Deploy to Supabase Edge Functions

import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
  try {
    const { user_id } = await req.json()
    if (!user_id) return new Response('Missing user_id', { status: 400 })

    // Fetch user row
    const { data: user, error } = await supabase.from('users').select('company_id, role, superuser').eq('id', user_id).single()
    if (error || !user) return new Response('User not found', { status: 404 })

    // Set custom claims (Supabase Admin API or via trigger)
    // This is a placeholder: actual implementation depends on Supabase project setup
    // See: https://supabase.com/docs/guides/auth/managing-user-attributes

    // Example: PATCH /auth/v1/admin/users/{user_id} with app_metadata
    // Not implemented here due to Edge Function limitations

    return new Response('Claims sync placeholder: fetched user', { status: 200 })
  } catch (e) {
    return new Response('Error: ' + (e?.message || e), { status: 500 })
  }
})
