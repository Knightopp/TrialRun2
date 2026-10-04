import { createClient } from '@supabase/supabase-js';

// SRISHTI 2.7 — Hardcoded to the correct Supabase project
// This bypasses any Vercel env vars that may still point to Ansel's old DB
const supabaseUrl = 'https://sdkadflrxjdhxduwvrsz.supabase.co';
const supabaseAnonKey = 'sb_publishable_WQB6od9EydJmJ_RmqncFuw_KzBjwg1w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
