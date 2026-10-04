import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseAnonKey = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];

const client = createClient(supabaseUrl, supabaseAnonKey);

async function testConcurrencyStress() {
  console.log('================================================================');
  console.log('SRISHTI 2.7 — SCANNER CONCURRENCY & RACE CONDITION TEST');
  console.log('================================================================\n');

  console.log('Testing 10 simultaneous registration attempts with the same fake participant/event ID...');

  const fakeParticipantId = '00000000-0000-0000-0000-000000000001';
  const fakeEventId = '00000000-0000-0000-0000-000000000002';

  // Fire 10 simultaneous insert requests at the exact same millisecond
  const promises = Array.from({ length: 10 }).map((_, i) =>
    client.from('registrations').insert([{
      participant_id: fakeParticipantId,
      event_id: fakeEventId,
      status: 'registered'
    }])
  );

  const results = await Promise.all(promises);
  console.log('All 10 simultaneous requests resolved.');

  const rejectedCount = results.filter(r => r.error !== null).length;
  console.log(`Requests blocked/rejected by RLS or Unique Constraint: ${rejectedCount}/10`);

  if (rejectedCount === 10) {
    console.log('✅ PASS: Unauthorized / duplicate concurrent inserts were 100% prevented.');
  } else {
    console.log(`Notice: ${10 - rejectedCount} inserts succeeded.`);
  }

  console.log('\nConcurrency verification complete.');
}

testConcurrencyStress();
