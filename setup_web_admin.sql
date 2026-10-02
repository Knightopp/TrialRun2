-- ==============================================================================
-- SRISHTI 2.7 — WEB ADMIN PANEL SETUP
-- ==============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor to enable the Web Admin Panel
-- and set up tsrknight@gmail.com as the Super Admin.
-- ==============================================================================

BEGIN;

-- 1. Add email and role columns to the existing event_admins table
ALTER TABLE public.event_admins ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.event_admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'coordinator';

-- 2. Insert or update the Super Admin account
INSERT INTO public.event_admins (username, password, email, role)
VALUES ('tsrknight_admin', 'srishti_super', 'tsrknight@gmail.com', 'superadmin')
ON CONFLICT (username) DO UPDATE 
SET email = EXCLUDED.email, role = EXCLUDED.role;

-- Force postgrest schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;
