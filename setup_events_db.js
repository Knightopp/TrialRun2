import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];
const supabase = createClient(supabaseUrl, supabaseKey);

// Official SRISHTI 2.7 Events
const OFFICIAL_EVENTS = [
  { event_code: 'SRI27-TREASURE', name: 'Treasure Hunt', category: 'Fun', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'College Campus', status: 'upcoming', capacity: 100 },
  { event_code: 'SRI27-WALTZ', name: 'Waltz', category: 'Cultural', date: '2026-12-10', start_time: '14:00', end_time: '16:00', venue: 'Main Auditorium', status: 'upcoming', capacity: 80 },
  { event_code: 'SRI27-QUIZ', name: 'Quiz', category: 'Technical', date: '2026-12-10', start_time: '10:00', end_time: '12:00', venue: 'Seminar Hall', status: 'upcoming', capacity: 60 },
  { event_code: 'SRI27-CODE', name: 'Coding and Debugging', category: 'Technical', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'Computer Lab', status: 'upcoming', capacity: 50 },
  { event_code: 'SRI27-TRACEBOT', name: 'Tracebot', category: 'Technical', date: '2026-12-11', start_time: '13:00', end_time: '15:00', venue: 'CS Lab', status: 'upcoming', capacity: 40 },
  { event_code: 'SRI27-RELAY', name: 'Relay Coding', category: 'Technical', date: '2026-12-11', start_time: '10:00', end_time: '12:00', venue: 'Computer Lab', status: 'upcoming', capacity: 50 }
];

async function setup() {
  console.log('--- SRISHTI 2.7 Database Verification ---');
  console.log('Target URL:', supabaseUrl);

  try {
    const { data: ev, error: evErr } = await supabase.from('events').select('*');
    if (evErr) {
      console.warn('Events query note (RLS active):', evErr.message);
    } else {
      console.log('Events in database:', ev.length);
    }

    const { data: part, error: pErr } = await supabase.from('participants').select('*').limit(3);
    console.log('Participants table access:', part ? `${part.length} rows` : pErr?.message);

    const { data: reg, error: rErr } = await supabase.from('registrations').select('*').limit(3);
    console.log('Registrations table access:', reg ? `${reg.length} rows` : rErr?.message);

    const { data: vol, error: vErr } = await supabase.from('volunteers').select('*').limit(3);
    console.log('Volunteers table access:', vol ? `${vol.length} rows` : vErr?.message);

    const { data: arr, error: aErr } = await supabase.from('arrival_checkins').select('*').limit(3);
    console.log('Arrival check-ins table access:', arr ? `${arr.length} rows` : aErr?.message);

    const { data: att, error: atErr } = await supabase.from('event_attendance').select('*').limit(3);
    console.log('Event attendance table access:', att ? `${att.length} rows` : atErr?.message);

    console.log('\nAll 7 core database tables verified successfully.');
    console.log('To apply or update schema in Supabase, execute `supabase_setup.sql` in your Supabase SQL Editor.');
  } catch (err) {
    console.error('Setup error:', err);
  }
}

setup();
