// scripts/migrate_fcm_tokens_to_supabase.js
// Usage: node scripts/migrate_fcm_tokens_to_supabase.js
// Requires: GOOGLE_APPLICATION_CREDENTIALS set for Firestore, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set for Supabase

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fetch = require('node-fetch');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

async function migrate() {
  const usersSnap = await db.collection('users').get();
  let migrated = 0;
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userId = doc.id;
    const fcmToken = data.fcmToken;
    if (!fcmToken) continue;
    const platform = data.platform || 'unknown';
    const payload = {
      user_id: userId,
      fcm_token: fcmToken,
      platform,
      updated_at: new Date().toISOString(),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_devices`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) migrated++;
    else console.error(`Failed for user ${userId}:`, await res.text());
  }
  console.log(`Migrated ${migrated} FCM tokens to Supabase.`);
}

migrate().catch(e => { console.error(e); process.exit(1); });
