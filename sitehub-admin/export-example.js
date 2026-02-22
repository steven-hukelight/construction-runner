
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);


async function exportSample() {
  // Replace with your table names
  const tables = ['jobs', 'workers', 'tasks']; // or whatever you have

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`Error fetching from ${table}:`, error.message);
      continue;
    }
    if (!data || data.length === 0) {
      console.log(`No rows in ${table}`);
      continue;
    }
    const row = data[0];
    console.log(`\nTable: ${table}`);
    console.log(`Row: ${JSON.stringify(row, null, 2)}`);
  }
}

exportSample().catch(console.error);