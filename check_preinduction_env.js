const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'sitehub-admin', '.env.local') });
console.log('ENV URL', process.env.SUPABASE_URL);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing env'); process.exit(1); }
const supa = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const uid = '8e5a0e26-1ad7-43d5-b89b-391c07328845';
(async () => {
  const tables = [
    'pre_induction_personal',
    'pre_induction_right_to_work',
    'pre_induction_certifications',
    'pre_induction_medical',
    'pre_induction_training',
    'pre_induction_competency_card',
    'pre_induction_declarations',
  ];
  for (const t of tables) {
    const { data, error } = await supa.from(t).select('*').eq('user_id', uid).maybeSingle();
    console.log(t, { error, data });
  }
  const { data: user, error: userErr } = await supa.from('users').select('id, pre_induction_status, compliance_score, company_id').eq('id', uid).maybeSingle();
  console.log('userErr', userErr);
  console.log('user', user);
})();
