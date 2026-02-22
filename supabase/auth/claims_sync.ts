// claims_sync.ts
// Edge Function or cron to sync JWT claims with users table
import { serve } from 'std/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  const { user_id } = await req.json()
  if (!user_id) return new Response('Missing user_id', { status: 400 })

  // Fetch user from users table
  const { data: user, error } = await supabase.from('users').select('id, company_id, role, superuser').eq('id', user_id).single()
  if (error || !user) {
    return new Response('User not found', { status: 404 })
  }

  // Update custom claims (requires Supabase Admin API or auth extension)
  // This is a placeholder: actual implementation depends on Supabase setup
  // e.g., call /auth/v1/admin/users/{id} PATCH with app_metadata

  // Example response
  return new Response(JSON.stringify({ success: true, user }), { headers: { 'Content-Type': 'application/json' } })
})
