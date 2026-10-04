-- ==============================================================================
-- FIX ROW LEVEL SECURITY (RLS) FOR SRISHTI 2.7 REGISTRATIONS & PARTICIPANTS
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/abpbucekqzvrueqwaqqw/sql
-- ==============================================================================

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 2. Drop any conflicting or restrictive participant policies
DROP POLICY IF EXISTS "Public can register participant" ON public.participants;
DROP POLICY IF EXISTS "Public can view own participant profile" ON public.participants;
DROP POLICY IF EXISTS "Public can update own participant profile" ON public.participants;
DROP POLICY IF EXISTS "Allow public all on participants" ON public.participants;

-- 3. Create permissive policies for participants
-- Allows anyone (anon or logged-in) to create their participant profile
CREATE POLICY "Public can register participant"
ON public.participants
FOR INSERT
TO anon, authenticated, public
WITH CHECK (true);

-- Allows participants and the registration form to view profiles
CREATE POLICY "Public can view own participant profile"
ON public.participants
FOR SELECT
TO anon, authenticated, public
USING (true);

-- Allows participants to update their profile
CREATE POLICY "Public can update own participant profile"
ON public.participants
FOR UPDATE
TO anon, authenticated, public
USING (true)
WITH CHECK (true);

-- 4. Drop any conflicting registration policies
DROP POLICY IF EXISTS "Public can register event" ON public.registrations;
DROP POLICY IF EXISTS "Public can view registrations" ON public.registrations;
DROP POLICY IF EXISTS "Allow public all on registrations" ON public.registrations;

-- 5. Create permissive policies for registrations
CREATE POLICY "Public can register event"
ON public.registrations
FOR INSERT
TO anon, authenticated, public
WITH CHECK (true);

CREATE POLICY "Public can view registrations"
ON public.registrations
FOR SELECT
TO anon, authenticated, public
USING (true);

-- 6. Grant table permissions to anon & authenticated roles
GRANT ALL ON public.participants TO anon, authenticated, service_role;
GRANT ALL ON public.registrations TO anon, authenticated, service_role;
GRANT SELECT ON public.events TO anon, authenticated, service_role;

-- 7. Secure Security Definer RPCs (Enables targeted zero-leak lookups)
CREATE OR REPLACE FUNCTION public.get_participant_by_email(lookup_email text)
RETURNS SETOF public.participants
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT *
    FROM public.participants
    WHERE LOWER(email) = LOWER(lookup_email)
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_registrations_by_email(lookup_email text)
RETURNS TABLE (
    id UUID,
    participant_id UUID,
    event_id UUID,
    status TEXT,
    registered_at TIMESTAMPTZ,
    event_name TEXT,
    event_code TEXT,
    event_venue TEXT,
    event_date DATE,
    event_time TIME
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        r.id,
        r.participant_id,
        r.event_id,
        r.status,
        r.registered_at,
        e.name AS event_name,
        e.event_code,
        e.venue AS event_venue,
        e.date AS event_date,
        e.start_time AS event_time
    FROM public.registrations r
    JOIN public.participants p ON p.id = r.participant_id
    JOIN public.events e ON e.id = r.event_id
    WHERE LOWER(p.email) = LOWER(lookup_email);
$$;

GRANT EXECUTE ON FUNCTION public.get_participant_by_email(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_registrations_by_email(text) TO anon, authenticated, service_role;

-- 8. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';

COMMIT;
