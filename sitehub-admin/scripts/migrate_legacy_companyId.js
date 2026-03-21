// migrate_legacy_companyId.js
// Migrates legacy documents missing companyId to the Test Company

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const TEST_COMPANY_ID = 'test-company-id'; // Replace with actual Test Company ID
const tables = [
  'sites',
  'rams',
  'operatives',
  'attendance',
  'deliveries',
  'tasks',
  'notices',
  'certifications',
  'settings',
];

async function migrate() {
  for (const table of tables) {
    // Find rows missing companyId
    const { data, error } = await supabase.from(table).select('id,companyId');
    if (error) {
      console.error(`Error reading ${table}:`, error.message);
      continue;
    }
    let updated = 0;
    for (const row of data) {
      if (!row.companyId || row.companyId === '' || row.companyId == null) {
        await supabase.from(table).update({ companyId: TEST_COMPANY_ID }).eq('id', row.id);
        updated++;
      }
    }
    console.log(`Table ${table}: ${updated} rows updated.`);
  }
  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
