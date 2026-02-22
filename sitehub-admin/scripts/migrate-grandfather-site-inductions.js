/**
 * Migration: Grandfather existing site inductions
 *
 * For each user with an existing site induction:
 * - Set users/{uid}/siteInductions/{siteId}.grandfathered = true
 * - Ensure users/{uid}.preInductionStatus = "not_started" if missing
 * - Ensure users/{uid}.adminPreInductionOverride = false if missing
 *
 * Does NOT modify induction completion dates or statuses.
 *
 * Usage: node scripts/migrate-grandfather-site-inductions.js
 * Requires: Firebase Admin SDK (serviceAccountKey.json or env vars)
 */


const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


async function main() {
  console.log("Starting grandfather migration (Supabase)...");

  const { data: users, error: userErr } = await supabase.from('users').select('*');
  if (userErr) throw userErr;
  let usersUpdated = 0;
  let siteInductionsUpdated = 0;

  for (const user of users) {
    const uid = user.id;
    const updates = {};
    if (user.preInductionStatus === undefined || user.preInductionStatus === null) {
      updates.preInductionStatus = "not_started";
    }
    if (user.adminPreInductionOverride === undefined || user.adminPreInductionOverride === null) {
      updates.adminPreInductionOverride = false;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('users').update(updates).eq('id', uid);
      usersUpdated++;
      console.log(`[users/${uid}] Set defaults:`, updates);
    }

    // Update all site_inductions for this user
    const { data: siteInductions, error: siErr } = await supabase.from('site_inductions').select('*').eq('user_id', uid);
    if (siErr) throw siErr;
    for (const si of siteInductions) {
      if (si.grandfathered !== true) {
        await supabase.from('site_inductions').update({ grandfathered: true }).eq('user_id', uid).eq('site_id', si.site_id);
        siteInductionsUpdated++;
        console.log(`[site_inductions user_id=${uid} site_id=${si.site_id}] Set grandfathered = true`);
      }
    }
  }

  console.log("\nMigration complete:");
  console.log(`  Users updated: ${usersUpdated}`);
  console.log(`  Site inductions updated: ${siteInductionsUpdated}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
