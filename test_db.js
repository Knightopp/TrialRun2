import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSRISHTIQueries() {
  console.log('--- Testing SRISHTI 2.7 Database Schema Queries ---');

  // Query 1: Registrations with joined participants and events
  console.log('\n[Query 1] Participant registrations query test:');
  const { data: regData, error: regErr } = await supabase
    .from('registrations')
    .select('status, participants(participant_code, name), events(event_code, name)')
    .limit(5);

  if (regErr) {
    console.log('Registrations query result (RLS note):', regErr.message);
  } else {
    console.log(`Registrations returned: ${regData.length} records`);
    if (regData.length > 0) console.log(JSON.stringify(regData[0], null, 2));
  }

  // Query 2: Arrival check-ins joined with participants
  console.log('\n[Query 2] Arrival check-ins query test:');
  const { data: arrData, error: arrErr } = await supabase
    .from('arrival_checkins')
    .select('checked_in_at, source, participants(participant_code, name)')
    .order('checked_in_at', { ascending: false })
    .limit(5);

  if (arrErr) {
    console.log('Arrival check-ins query result (RLS note):', arrErr.message);
  } else {
    console.log(`Arrival check-ins returned: ${arrData.length} records`);
    if (arrData.length > 0) console.log(JSON.stringify(arrData[0], null, 2));
  }

  // Query 3: Event Attendance
  console.log('\n[Query 3] Event attendance query test:');
  const { data: attData, error: attErr } = await supabase
    .from('event_attendance')
    .select('marked_at, source, participants(participant_code, name), events(event_code, name)')
    .limit(5);

  if (attErr) {
    console.log('Event attendance query result (RLS note):', attErr.message);
  } else {
    console.log(`Event attendance records: ${attData.length}`);
  }

  // Query 4: Event Staff assignments
  console.log('\n[Query 4] Event Staff assignments query test:');
  const { data: staffData, error: staffErr } = await supabase
    .from('event_staff')
    .select('*, volunteers(name, username, role), events(event_code, name)')
    .limit(5);

  if (staffErr) {
    console.log('Event staff assignments result (RLS note):', staffErr.message);
  } else {
    console.log(`Event staff assignments: ${staffData.length}`);
  }

  // Query 5: Test participant insert
  console.log('\n[Query 5] Test participant insert:');
  const testCode = 'TEST-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const { data: insData, error: insErr } = await supabase
    .from('participants')
    .insert([{
      participant_code: testCode,
      name: 'RLS Verification User',
      email: 'rls_test@srishti.live',
      phone: '1234567890',
      college: 'Test College'
    }])
    .select();

  if (insErr) {
    console.log('Participant insert error:', insErr.message);
  } else {
    console.log('Participant insert success!');
    if (insData?.[0]?.id) {
      await supabase.from('participants').delete().eq('id', insData[0].id);
    }
  }
}

testSRISHTIQueries();
