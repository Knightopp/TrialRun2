import { createClient } from '@supabase/supabase-js';

const TARGET_URL = 'https://sdkadflrxjdhxduwvrsz.supabase.co';
const TARGET_ANON_KEY = 'sb_publishable_WQB6od9EydJmJ_RmqncFuw_KzBjwg1w';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If Vercel env still points to Ansel's old DB (abpbucekqzvrueqwaqqw), automatically redirect to new DB
const supabaseUrl = (!envUrl || envUrl.includes('abpbucekqzvrueqwaqqw')) ? TARGET_URL : envUrl;
const supabaseAnonKey = (!envKey || envKey.includes('Joc0bEULsqQDch97tTnLNg')) ? TARGET_ANON_KEY : envKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
