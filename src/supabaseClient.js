import { createClient } from '@supabase/supabase-js';

// The website, Flutter app, and server integrations must all target this project.
const sharedProjectUrl = 'https://sdkadflrxjdhxduwvrsz.supabase.co';
const configuredProjectUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || sharedProjectUrl;
const projectUrl = new URL(configuredProjectUrl);

if (projectUrl.protocol !== 'https:' || projectUrl.hostname !== new URL(sharedProjectUrl).hostname) {
  throw new Error('VITE_SUPABASE_URL must point to the shared SRISHTI Supabase project.');
}

const supabaseUrl = projectUrl.origin;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_WQB6od9EydJmJ_RmqncFuw_KzBjwg1w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
