import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('registrations').select('*').limit(1);
  if (error) {
    console.error('Error fetching registrations:', error);
  } else {
    console.log('Registrations columns:', data.length ? Object.keys(data[0]) : 'Table is empty');
  }
}

test();
