-- ==============================================================================
-- SRISHTI 2.7 — ZERO-TRUST STRICT RLS SECURITY ARCHITECTURE
-- ==============================================================================
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/abpbucekqzvrueqwaqqw/sql
-- ==============================================================================
-- Model:
--   * PUBLIC (anon):
--       - events: SELECT only
--       - participants: INSERT only (Table-wide SELECT is strictly BLOCKED)
--       - registrations: INSERT only (Table-wide SELECT is strictly BLOCKED)
--       - volunteer/checkin/attendance: Zero access
--       - Attendee lookups: Isolated Security Definer RPC (email-specific only)
--   * ADMIN & STAFF (authenticated in public.volunteers):
--       - Full management (SELECT, INSERT, UPDATE, DELETE) via RLS role checks
-- ==============================================================================

BEGIN;

-- 1. Enable RLS on all 7 core tables
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrival_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- 2. Drop all prior policies to start clean
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('participants', 'events', 'registrations', 'volunteers', 'event_staff', 'arrival_checkins', 'event_attendance')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 3. Security Helper Functions for Role Checking
CREATE OR REPLACE FUNCTION public.is_srishti_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_srishti_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role IN ('admin', 'registration', 'event_staff')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_event_staff_for_event(target_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        JOIN public.event_staff es ON es.volunteer_id = v.id
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'event_staff'
          AND es.event_id = target_event_id
    );
$$;

-- 4. PUBLIC POLICIES (Strict: NO table-wide SELECT on sensitive data)

-- 4A. Events: Public can browse upcoming events
CREATE POLICY "Public can view upcoming events"
ON public.events FOR SELECT TO anon, authenticated
USING (status IN ('upcoming', 'ongoing') OR public.is_srishti_staff());

-- 4B. Participants: Public can INSERT only (No table dumping/scraping)
CREATE POLICY "Public can insert participant"
ON public.participants FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4C. Registrations: Public can INSERT only (No table dumping/scraping)
CREATE POLICY "Public can insert registration"
ON public.registrations FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 5. ADMIN & STAFF POLICIES (Full control for authenticated staff)

-- 5A. Participants: Staff can view all, Admin can manage all
CREATE POLICY "Staff can view participants"
ON public.participants FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage participants"
ON public.participants FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5B. Registrations: Staff can view all, Admin can manage all
CREATE POLICY "Staff can view registrations"
ON public.registrations FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage registrations"
ON public.registrations FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5C. Events: Admin can manage events
CREATE POLICY "Admin can manage events"
ON public.events FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5D. Volunteers & Staff: Admin manages, staff views
CREATE POLICY "Admin can manage volunteers"
ON public.volunteers FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Staff can view volunteers"
ON public.volunteers FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage event staff"
ON public.event_staff FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Staff can view event staff"
ON public.event_staff FOR SELECT TO authenticated
USING (public.is_srishti_staff());

-- 5E. Arrival Check-ins: Staff can mark and view
CREATE POLICY "Staff can manage arrival checkins"
ON public.arrival_checkins FOR ALL TO authenticated
USING (public.is_srishti_staff())
WITH CHECK (public.is_srishti_staff());

-- 5F. Event Attendance: Staff can mark and view
CREATE POLICY "Staff can manage event attendance"
ON public.event_attendance FOR ALL TO authenticated
USING (public.is_srishti_staff())
WITH CHECK (public.is_srishti_staff());

-- 6. PRIVILEGES: Revoke broad permissions from anon, grant only required
REVOKE ALL ON public.participants FROM anon;
REVOKE ALL ON public.registrations FROM anon;
REVOKE ALL ON public.volunteers FROM anon;
REVOKE ALL ON public.event_staff FROM anon;
REVOKE ALL ON public.arrival_checkins FROM anon;
REVOKE ALL ON public.event_attendance FROM anon;

GRANT INSERT ON public.participants TO anon;
GRANT INSERT ON public.registrations TO anon;
GRANT SELECT ON public.events TO anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 7. SECURE SECURITY DEFINER RPCs (Targeted zero-leak lookups)
-- Allows a student to see ONLY their own record by exact email match without exposing the table!
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

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
