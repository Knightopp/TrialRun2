-- ==============================================================================
-- SRISHTI 2.7 — PRODUCTION ZERO-TRUST SECURITY & RLS ARCHITECTURE
-- ==============================================================================
-- Addresses all authorization boundaries, data leakage prevention, 
-- event-staff scoping, and public registration tampering protections.
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

-- 2. Drop all prior policies cleanly
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

CREATE OR REPLACE FUNCTION public.is_srishti_registration()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'registration'
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

-- 4. PUBLIC POLICIES (anon & unauthenticated)

-- 4A. Events: Public can only view upcoming/ongoing festival events
CREATE POLICY "Public can view upcoming events"
ON public.events FOR SELECT TO anon, authenticated
USING (status IN ('upcoming', 'ongoing') OR public.is_srishti_staff());

-- 4B. Participants: Public can INSERT only (Table-wide SELECT is BLOCKED)
CREATE POLICY "Public can insert participant"
ON public.participants FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4C. Registrations: Public can INSERT only with strictly enforced status = 'registered'
-- (Prevents clients from tampering with status, payment, or attendance)
CREATE POLICY "Public can insert registration"
ON public.registrations FOR INSERT TO anon, authenticated
WITH CHECK (status = 'registered');

-- 5. ADMIN & ROLE-SCOPED STAFF POLICIES

-- 5A. Participants Management
CREATE POLICY "Staff can view all participants"
ON public.participants FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage participants"
ON public.participants FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5B. Registrations Management
CREATE POLICY "Staff can view all registrations"
ON public.registrations FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage registrations"
ON public.registrations FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5C. Events Management
CREATE POLICY "Admin can manage events"
ON public.events FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5D. Volunteers & Staff Roles (Anti-self-promotion: only Admin can assign/modify roles)
CREATE POLICY "Staff can view active volunteers"
ON public.volunteers FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage volunteers"
ON public.volunteers FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Staff can view event staff"
ON public.event_staff FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage event staff"
ON public.event_staff FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 5E. Arrival Gate Check-ins (Scattered across gate staff only)
CREATE POLICY "Admin can manage all arrival checkins"
ON public.arrival_checkins FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Registration staff can manage arrival checkins"
ON public.arrival_checkins FOR ALL TO authenticated
USING (public.is_srishti_registration())
WITH CHECK (public.is_srishti_registration());

CREATE POLICY "Event staff can view arrival checkins"
ON public.arrival_checkins FOR SELECT TO authenticated
USING (public.is_srishti_staff());

-- 5F. Event Room Attendance (CRITICAL FIX: Event Staff strictly limited to their assigned event!)
CREATE POLICY "Admin can manage all event attendance"
ON public.event_attendance FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Event staff can manage assigned event attendance"
ON public.event_attendance FOR ALL TO authenticated
USING (public.is_event_staff_for_event(event_id))
WITH CHECK (public.is_event_staff_for_event(event_id));

CREATE POLICY "Registration staff can view attendance"
ON public.event_attendance FOR SELECT TO authenticated
USING (public.is_srishti_registration());

-- 6. EXPLICIT PRIVILEGES (No blanket GRANT ALL)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public anon permissions:
GRANT SELECT ON public.events TO anon;
GRANT INSERT ON public.participants TO anon;
GRANT INSERT ON public.registrations TO anon;

-- Authenticated staff permissions (RLS strictly governs row access):
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arrival_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendance TO authenticated;

-- 7. SECURE SECURITY DEFINER RPCs (Data-minimized, zero-leak lookups)

-- 7A. Data-Minimized Participant Autofill (Does NOT leak sensitive internal data)
CREATE OR REPLACE FUNCTION public.get_participant_by_email(lookup_email text)
RETURNS TABLE (
    id UUID,
    participant_code TEXT,
    name TEXT,
    email TEXT,
    college TEXT,
    department TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        p.id,
        p.participant_code,
        p.name,
        p.email,
        p.college,
        p.department
    FROM public.participants p
    WHERE LOWER(p.email) = LOWER(TRIM(lookup_email))
    LIMIT 1;
$$;

-- 7B. Registration Lookup for Ticket Passes
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
    WHERE LOWER(p.email) = LOWER(TRIM(lookup_email));
$$;

-- 7C. Atomic Server-Side Registration Procedure
-- (Guarantees status = 'registered', auto-generates code, eliminates client manipulation)
CREATE OR REPLACE FUNCTION public.register_participant_and_event(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_college TEXT,
    p_department TEXT,
    p_year TEXT,
    p_event_id UUID,
    p_participant_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_participant_id UUID;
    v_final_code TEXT;
    v_reg_id UUID;
BEGIN
    SELECT id, participant_code INTO v_participant_id, v_final_code
    FROM public.participants
    WHERE LOWER(email) = v_clean_email
    LIMIT 1;

    IF v_participant_id IS NULL THEN
        v_final_code := COALESCE(NULLIF(TRIM(p_participant_code), ''), 'SRI27-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6)));
        INSERT INTO public.participants (participant_code, name, email, phone, college, department, year)
        VALUES (v_final_code, TRIM(p_name), v_clean_email, TRIM(p_phone), TRIM(p_college), COALESCE(p_department, 'General'), COALESCE(p_year, '2026'))
        RETURNING id INTO v_participant_id;
    ELSE
        UPDATE public.participants
        SET name = COALESCE(NULLIF(TRIM(p_name), ''), name),
            phone = COALESCE(NULLIF(TRIM(p_phone), ''), phone),
            college = COALESCE(NULLIF(TRIM(p_college), ''), college)
        WHERE id = v_participant_id;
    END IF;

    IF p_event_id IS NOT NULL THEN
        INSERT INTO public.registrations (participant_id, event_id, status)
        VALUES (v_participant_id, p_event_id, 'registered')
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_reg_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'participant_code', v_final_code,
        'registration_id', v_reg_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_participant_by_email(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_registrations_by_email(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.register_participant_and_event(text, text, text, text, text, text, uuid, text) TO anon, authenticated, service_role;

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
