import { createClient } from '@supabase/supabase-js';

// The website, Flutter app, and server integrations must all target this project.
const sharedProjectUrl = 'https://sdkadflrxjdhxduwvrsz.supabase.co';
// Keep the URL pinned so a stale Vercel VITE_SUPABASE_URL cannot split traffic.
const supabaseUrl = sharedProjectUrl;
const supabaseAnonKey = 'sb_publishable_WQB6od9EydJmJ_RmqncFuw_KzBjwg1w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
