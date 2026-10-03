-- ==============================================================================
-- SRISHTI 2.7 — WEB ADMIN PANEL SETUP & REPAIR SCRIPT
-- ==============================================================================
-- Run this in your Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/abpbucekqzvrueqwaqqw/sql)
-- to grant tsrknight@gmail.com full Super Admin privileges.
-- ==============================================================================

BEGIN;

-- 1. Create event_admins table if missing
CREATE TABLE IF NOT EXISTS public.event_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'superadmin',
    event_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.event_admins ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.event_admins ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'superadmin';
ALTER TABLE public.event_admins ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Ensure volunteers table has tsrknight@gmail.com as superadmin
CREATE TABLE IF NOT EXISTS public.volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'superadmin',
    phone TEXT,
    event_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure unique constraint on volunteers email
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'volunteers_email_key'
  ) THEN
    BEGIN
      ALTER TABLE public.volunteers ADD CONSTRAINT volunteers_email_key UNIQUE (email);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- 3. Insert / update the Super Admin account in both tables
INSERT INTO public.volunteers (name, email, role)
VALUES ('Master Superadmin', 'tsrknight@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE 
SET role = 'superadmin', name = 'Master Superadmin';

INSERT INTO public.event_admins (username, password, name, email, role)
VALUES ('tsrknight_admin', 'srishti_super', 'Master Superadmin', 'tsrknight@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE 
SET role = 'superadmin', name = 'Master Superadmin';

-- 4. Enable public RLS access for both
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on volunteers" ON public.volunteers;
CREATE POLICY "Allow public all on volunteers" ON public.volunteers FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on event_admins" ON public.event_admins;
CREATE POLICY "Allow public all on event_admins" ON public.event_admins FOR ALL TO public USING (true) WITH CHECK (true);

GRANT ALL ON public.volunteers TO anon, authenticated;
GRANT ALL ON public.event_admins TO anon, authenticated;

-- Force postgrest schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;
