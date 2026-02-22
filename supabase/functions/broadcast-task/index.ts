// Supabase Edge Function: broadcast-task
// Broadcasts a task to an FCM topic
import { serve } from 'std/server'

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')
const FCM_URL = 'https://fcm.googleapis.com/fcm/send'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }
  if (!FCM_SERVER_KEY) {
    return new Response('FCM server key not configured', { status: 500 })
  }
  const { topic, title, message } = await req.json()
  if (!topic || !title || !message) {
    return new Response('Missing required fields', { status: 400 })
  }
  const notification = {
    title,
    body: message
  }
  const data = {
    type: 'task'
  }
  const payload = {
    topic,
    notification,
    data
  }
  const res = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    return new Response(`FCM error: ${await res.text()}`, { status: 502 })
  }
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
