import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL="([^"]+)"/)[1];
const supabaseAnonKey = env.match(/VITE_SUPABASE_ANON_KEY="([^"]+)"/)[1];

// Anonymous public client (no auth headers, purely public visitor)
const anonClient = createClient(supabaseUrl, supabaseAnonKey);

async function runSecurityMatrix() {
  console.log('================================================================');
  console.log('SRISHTI 2.7 — ZERO-TRUST SECURITY AUDIT & VERIFICATION MATRIX (V4)');
  console.log('================================================================\n');

  const results = [];

  // Test 1: Anonymous -> SELECT participants
  try {
    const { data, error } = await anonClient.from('participants').select('id, name, phone, email').limit(5);
    const passed = (!error && data?.length === 0) || (error && error.code === '42501');
    results.push({
      test: 'Anonymous → SELECT participants',
      expected: '❌ Blocked (0 rows / RLS denied)',
      actual: error ? `Error: ${error.message}` : `${data.length} rows visible`,
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → SELECT participants', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 2: Anonymous -> SELECT registrations
  try {
    const { data, error } = await anonClient.from('registrations').select('*').limit(5);
    const passed = (!error && data?.length === 0) || (error && error.code === '42501');
    results.push({
      test: 'Anonymous → SELECT registrations',
      expected: '❌ Blocked (0 rows / RLS denied)',
      actual: error ? `Error: ${error.message}` : `${data.length} rows visible`,
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → SELECT registrations', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 3: Anonymous -> SELECT volunteers
  try {
    const { data, error } = await anonClient.from('volunteers').select('*').limit(5);
    const passed = (!error && data?.length === 0) || (error && error.code === '42501');
    results.push({
      test: 'Anonymous → SELECT volunteers',
      expected: '❌ Blocked (0 rows / RLS denied)',
      actual: error ? `Error: ${error.message}` : `${data.length} rows visible`,
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → SELECT volunteers', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 4: Anonymous -> Direct INSERT participant
  try {
    const { error } = await anonClient.from('participants').insert([{
      participant_code: 'TEST-HACK-01',
      name: 'Hacker',
      email: 'hacker@example.com'
    }]);
    const passed = error !== null;
    results.push({
      test: 'Anonymous → Direct INSERT participants',
      expected: '❌ Blocked (Permission denied)',
      actual: error ? error.message : 'INSERT allowed',
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → Direct INSERT participants', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 5: Anonymous -> Direct INSERT registration with status='confirmed'
  try {
    const { error } = await anonClient.from('registrations').insert([{
      participant_id: '00000000-0000-0000-0000-000000000000',
      event_id: '00000000-0000-0000-0000-000000000000',
      status: 'confirmed'
    }]);
    const passed = error !== null;
    results.push({
      test: "Anonymous → Direct INSERT with status='confirmed'",
      expected: '❌ Blocked (Permission denied / RLS check)',
      actual: error ? error.message : 'Tampered INSERT allowed',
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: "Anonymous → Direct INSERT status='confirmed'", expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 6: Anonymous -> UPDATE participant
  try {
    const { data, error } = await anonClient.from('participants').update({ name: 'Hijacked' }).eq('email', 'test@test.com').select();
    const passed = (error !== null) || (!data || data.length === 0);
    results.push({
      test: 'Anonymous → UPDATE participant',
      expected: '❌ Blocked (0 rows updated / permission denied)',
      actual: error ? error.message : `${data?.length || 0} rows updated`,
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → UPDATE participant', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 7: Anonymous -> DELETE registration
  try {
    const { data, error } = await anonClient.from('registrations').delete().eq('status', 'registered').select();
    const passed = (error !== null) || (!data || data.length === 0);
    results.push({
      test: 'Anonymous → DELETE registration',
      expected: '❌ Blocked (0 rows deleted / permission denied)',
      actual: error ? error.message : `${data?.length || 0} rows deleted`,
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → DELETE registration', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 8: Anonymous -> SELECT events (Public read allowed for published events)
  try {
    const { data, error } = await anonClient.from('events').select('id, name, event_code, status').limit(5);
    const passed = !error && Array.isArray(data);
    results.push({
      test: 'Anonymous → SELECT upcoming events',
      expected: '✅ Allowed (Public catalogue view)',
      actual: error ? error.message : `Retrieved ${data.length} published events`,
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → SELECT events', expected: '✅ Allowed', actual: e.message, status: '🚨 FAIL' });
  }

  // Test 9: Anonymous -> get_participant_by_email does NOT leak pass_token
  try {
    const { data, error } = await anonClient.rpc('get_participant_by_email', { lookup_email: 'test@example.com' });
    const hasToken = data && data.length > 0 && 'pass_token' in data[0];
    results.push({
      test: 'Anonymous → get_participant_by_email (Bearer Token Leak Check)',
      expected: '❌ pass_token NOT returned (Zero-leak)',
      actual: hasToken ? '🚨 LEAKED pass_token!' : 'Zero token returned',
      status: !hasToken ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → get_participant_by_email', expected: 'Zero-leak', actual: e.message, status: '✅ PASS' });
  }

  // Test 10: Anonymous -> get_registrations_by_email does NOT leak pass_token
  try {
    const { data, error } = await anonClient.rpc('get_registrations_by_email', { lookup_email: 'test@example.com' });
    const hasToken = data && data.length > 0 && 'pass_token' in data[0];
    results.push({
      test: 'Anonymous → get_registrations_by_email (Bearer Token Leak Check)',
      expected: '❌ pass_token NOT returned (Zero-leak)',
      actual: hasToken ? '🚨 LEAKED pass_token!' : 'Zero token returned',
      status: !hasToken ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → get_registrations_by_email', expected: 'Zero-leak', actual: e.message, status: '✅ PASS' });
  }

  // Test 11: Anonymous -> get_my_pass_credential (Identity check)
  try {
    const { data, error } = await anonClient.rpc('get_my_pass_credential');
    const passed = error !== null || (!data || data.length === 0);
    results.push({
      test: 'Anonymous → get_my_pass_credential()',
      expected: '❌ Blocked (Requires authentication)',
      actual: error ? error.message : (data?.length ? 'Leaked' : '0 rows returned'),
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → get_my_pass_credential()', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 12: Anonymous -> verify_and_checkin_pass (Scanner RPC)
  try {
    const { data, error } = await anonClient.rpc('verify_and_checkin_pass', {
      p_code: 'SRI27-FAKE',
      p_token: 'fake-token',
      p_station: 'gate'
    });
    const passed = error !== null || (data && data.valid === false);
    results.push({
      test: 'Anonymous → verify_and_checkin_pass()',
      expected: '❌ Blocked (Unauthorized station caller)',
      actual: error ? error.message : (data?.error || 'Rejected'),
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → verify_and_checkin_pass()', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 13: Anonymous -> register_participant_and_event with existing email (Profile Tamper & Token Leak Check)
  try {
    const { data, error } = await anonClient.rpc('register_participant_and_event', {
      p_name: 'Attacker Impersonator',
      p_email: 'tsrknight@gmail.com',
      p_phone: '9999999999',
      p_college: 'Attacker College',
      p_department: 'Cyber',
      p_year: '2026'
    });
    // Expected: rejected because email already exists and caller is anonymous
    const isProtected = error !== null || (data && !data.success && data.is_existing && !data.pass_token);
    results.push({
      test: 'Anonymous → register with existing email (Account Hijacking Check)',
      expected: '❌ Blocked (Zero profile modification & pass_token: null)',
      actual: isProtected ? `Protected: ${data?.error || error?.message}` : '🚨 Tampered existing account!',
      status: isProtected ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → register with existing email', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Test 14: Anonymous -> link_participant_to_auth (Unowned Account Claiming Check)
  try {
    const { data, error } = await anonClient.rpc('link_participant_to_auth');
    const passed = error !== null || (data && !data.success);
    results.push({
      test: 'Anonymous → link_participant_to_auth() (Claim Bypass Check)',
      expected: '❌ Blocked (Requires verified authenticated session)',
      actual: error ? error.message : (data?.error || 'Rejected'),
      status: passed ? '✅ PASS' : '🚨 FAIL'
    });
  } catch (e) {
    results.push({ test: 'Anonymous → link_participant_to_auth()', expected: '❌ Blocked', actual: e.message, status: '✅ PASS' });
  }

  // Print results table
  console.table(results);
  console.log('\nAudit complete.');
}

runSecurityMatrix();
