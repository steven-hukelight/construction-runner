import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

describe('Realtime', () => {
  it('should receive updates on row insert', async () => {
    const table = 'attendance';
    const testRow = { user_id: 'testuser', status: 'IN', timestamp: new Date().toISOString() };
    let received = false;

    const subscription = supabase.channel('attendance-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, (payload) => {
        if (payload.new && payload.new.user_id === testRow.user_id) {
          received = true;
        }
      })
      .subscribe();

    // Insert row
    await supabase.from(table).insert([testRow]);

    // Wait for up to 3 seconds for the event
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(received).toBe(true);

    await supabase.removeChannel(subscription);
  });
});
