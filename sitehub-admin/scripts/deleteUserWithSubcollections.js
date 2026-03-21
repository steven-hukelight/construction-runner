/* eslint-disable @typescript-eslint/no-require-imports */
// Delete a user and all related subcollection rows in Supabase (site_inductions, certifications, etc)
// Usage: node deleteUserWithSubcollections.js <userId>

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteUserAndSubcollections(userId) {
  // Delete site inductions
  await supabase.from('site_inductions').delete().eq('user_id', userId);
  // Delete certifications
  await supabase.from('certifications').delete().eq('user_id', userId);
  // Delete training
  await supabase.from('training').delete().eq('user_id', userId);
  // Delete notices (if user-specific)
  await supabase.from('notices').delete().eq('user_id', userId);
  // Delete tasks (if user-specific)
  await supabase.from('tasks').delete().eq('user_id', userId);
  // Delete user row
  await supabase.from('users').delete().eq('id', userId);
  console.log(`Deleted user and related subcollection rows for: ${userId}`);
}

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node deleteUserWithSubcollections.js <userId>');
  process.exit(1);
}

deleteUserAndSubcollections(userId)
  .then(() => console.log('Done'))
  .catch(err => console.error(err));
