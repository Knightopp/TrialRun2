-- ==============================================================================
-- SRISHTI 2.7 — COMPLETE DATABASE SETUP & REPAIR SCRIPT
-- Target Project: https://abpbucekqzvrueqwaqqw.supabase.co
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/abpbucekqzvrueqwaqqw/sql
-- 2. Click "New Query" (or SQL Editor), paste this entire script, and click "Run".
-- 3. This script is fully idempotent and safe to run multiple times.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. ENSURE ALL TABLES EXIST WITH REQUIRED COLUMNS
-- ------------------------------------------------------------------------------

-- 1A. Participants Table
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_code TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    college TEXT,
    department TEXT DEFAULT 'N/A',
    year TEXT DEFAULT 'N/A',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS participant_code TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'N/A';
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS year TEXT DEFAULT 'N/A';
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 1B. Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code TEXT UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    venue TEXT,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure event_code has a unique constraint for ON CONFLICT upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_event_code_key'
  ) THEN
    BEGIN
      ALTER TABLE public.events ADD CONSTRAINT events_event_code_key UNIQUE (event_code);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
END $$;

-- 1C. Registrations Table
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    participant_code TEXT,
    event_name TEXT,
    team_size INTEGER DEFAULT 1,
    lead_name TEXT,
    lead_college TEXT,
    lead_email TEXT,
    lead_phone TEXT,
    lead_roll TEXT,
    team_members JSONB DEFAULT '[]'::jsonb,
    payment_status TEXT DEFAULT 'verified',
    status TEXT DEFAULT 'registered',
    registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all optional & helper columns exist on registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_code TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 1;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS lead_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS lead_college TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS lead_email TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS lead_phone TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS lead_roll TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'verified';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'registered';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT NOW();

-- 1D. Volunteers / Event Admins
CREATE TABLE IF NOT EXISTS public.volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'coordinator',
    phone TEXT,
    event_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'coordinator';
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS event_id UUID;

-- Ensure volunteers email has unique constraint
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

-- 1E. Legacy event_admins compatibility table
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

-- 1F. Arrival Checkins & Event Attendance Tables
CREATE TABLE IF NOT EXISTS public.arrival_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_by TEXT
);

CREATE TABLE IF NOT EXISTS public.event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID REFERENCES public.participants(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    marked_by TEXT
);

-- 1G. OTP Codes Table
CREATE TABLE IF NOT EXISTS public.otp_codes (
    email TEXT PRIMARY KEY,
    code VARCHAR(6) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES — ALLOW ALL PUBLIC ACCESS FOR ANON CLIENT
-- ------------------------------------------------------------------------------
-- Srishti 2.7 uses an anonymous client for public festival attendees to register,
-- verify email via OTP, view tickets, and admin operations.

-- Participants
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on participants" ON public.participants;
DROP POLICY IF EXISTS "Allow public insert on participants" ON public.participants;
DROP POLICY IF EXISTS "Allow public select on participants" ON public.participants;
DROP POLICY IF EXISTS "Allow public update on participants" ON public.participants;

CREATE POLICY "Allow public all on participants"
ON public.participants FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Registrations
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow public insert on registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow public select on registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow public update on registrations" ON public.registrations;

CREATE POLICY "Allow public all on registrations"
ON public.registrations FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on events" ON public.events;
DROP POLICY IF EXISTS "Allow public select on events" ON public.events;

CREATE POLICY "Allow public all on events"
ON public.events FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Volunteers
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Allow read access to volunteers" ON public.volunteers;

CREATE POLICY "Allow public all on volunteers"
ON public.volunteers FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Event Admins
ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on event_admins" ON public.event_admins;

CREATE POLICY "Allow public all on event_admins"
ON public.event_admins FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Arrival Checkins
ALTER TABLE public.arrival_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on arrival_checkins" ON public.arrival_checkins;
DROP POLICY IF EXISTS "Allow read access to arrival_checkins" ON public.arrival_checkins;

CREATE POLICY "Allow public all on arrival_checkins"
ON public.arrival_checkins FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Event Attendance
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on event_attendance" ON public.event_attendance;
DROP POLICY IF EXISTS "Allow read access to event_attendance" ON public.event_attendance;

CREATE POLICY "Allow public all on event_attendance"
ON public.event_attendance FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- OTP Codes
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all on otp_codes" ON public.otp_codes;

CREATE POLICY "Allow public all on otp_codes"
ON public.otp_codes FOR ALL
TO public
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 3. GRANT PERMISSIONS TO ANON AND AUTHENTICATED ROLES
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 4. CONFIGURE TSRKNIGHT@GMAIL.COM AS SUPER ADMIN IN ALL TABLES
-- ------------------------------------------------------------------------------

-- In volunteers table:
INSERT INTO public.volunteers (name, email, role)
VALUES ('Master Superadmin', 'tsrknight@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE
SET role = 'superadmin', name = 'Master Superadmin';

-- In event_admins table:
INSERT INTO public.event_admins (username, password, name, email, role)
VALUES ('tsrknight_admin', 'srishti_super', 'Master Superadmin', 'tsrknight@gmail.com', 'superadmin')
ON CONFLICT (email) DO UPDATE
SET role = 'superadmin', name = 'Master Superadmin';

-- In participants table (Admin delegate pass):
INSERT INTO public.participants (participant_code, name, email, phone, college, department, year)
VALUES ('SRI27-ADMIN', 'Master Admin', 'tsrknight@gmail.com', '9999999999', 'Srishti HQ', 'Admin', 'Faculty')
ON CONFLICT (participant_code) DO UPDATE
SET name = 'Master Admin', email = 'tsrknight@gmail.com';


-- ------------------------------------------------------------------------------
-- 5. SEED THE 11 OFFICIAL SRISHTI 2.7 FESTIVAL EVENTS
-- ------------------------------------------------------------------------------
INSERT INTO public.events (event_code, name, category, date, start_time, end_time, venue, status)
VALUES
  ('tracebot', 'TRACE BOT', 'ROBOTICS', '2026-12-06', '10:00:00', '13:00:00', 'Robotics Arena', 'scheduled'),
  ('treasurehunt', 'TREASURE HUNT', 'FUN', '2026-12-07', '13:00:00', '16:00:00', 'Campus Wide', 'scheduled'),
  ('codingdebugging', 'CODING & DEBUGGING', 'DEV', '2026-12-06', '11:00:00', '13:00:00', 'Computer Lab 1', 'scheduled'),
  ('aiwebsitemaking', 'AI WEBSITE MAKING', 'DEV', '2026-12-07', '09:30:00', '12:30:00', 'Computer Lab 2', 'scheduled'),
  ('blindcoding', 'BLIND CODING', 'DEV', '2026-12-06', '14:00:00', '16:00:00', 'Computer Lab 1', 'scheduled'),
  ('ideathon', 'IDEATHON', 'INNOVATION', '2026-12-07', '10:30:00', '13:30:00', 'Seminar Hall A', 'scheduled'),
  ('waltz', 'WALTZ (DANCE)', 'CULTURE', '2026-12-07', '16:00:00', '19:00:00', 'Open Air Auditorium', 'scheduled'),
  ('mindgame', 'MINDGAME', 'PUZZLE', '2026-12-06', '15:00:00', '17:00:00', 'Hall B Room 204', 'scheduled'),
  ('itquiz', 'IT QUIZ', 'KNOWLEDGE', '2026-12-07', '11:30:00', '13:30:00', 'Main Auditorium', 'scheduled'),
  ('facepainting', 'FACE PAINTING', 'ART', '2026-12-06', '12:00:00', '14:00:00', 'Student Activity Quad', 'scheduled'),
  ('hackathon', 'HACKATHON', 'DEV', '2026-12-06', '17:00:00', '21:00:00', 'Innovation Hub', 'scheduled')
ON CONFLICT (event_code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  venue = EXCLUDED.venue,
  status = EXCLUDED.status;

-- Reload postgrest schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
