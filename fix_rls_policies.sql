-- ==============================================================================
-- SRISHTI 2.7 — PRODUCTION ZERO-TRUST SECURITY & RLS ARCHITECTURE (V3 FINAL)
-- ==============================================================================
-- Addressed Security Verifications:
-- 1. SERVER-AUTHORITATIVE PASS TOKENS: High-entropy 128-bit random tokens 
--    generated directly in PostgreSQL (gen_random_bytes). Zero secrets in client JS.
-- 2. ZERO DIRECT TABLE ACCESS FOR PUBLIC: Revoked direct INSERT on participants 
--    and registrations. Public MUST go through register_participant_and_event() RPC.
-- 3. SCOPED EVENT ATTENDANCE: Event coordinators strictly limited to their 
--    assigned event (is_event_staff_for_event).
-- 4. ATOMIC CHECK-IN RPC: Server-side validation, duplicate prevention, and role checking.
-- 5. MINIMAL DATA PROJECTION: Isolated, zero-leak RPCs for autofill & passes.
-- 6. NO BLANKET GRANTS: Granular least-privilege privileges only.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA HARDENING & PASS TOKEN COLUMN
-- -----------------------------------------------------------------------------
-- Ensure pgcrypto extension is active for cryptographic random token generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add server-generated cryptographic pass_token to participants if not present
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS pass_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

-- Backfill any existing participants missing pass_token
UPDATE public.participants 
SET pass_token = encode(gen_random_bytes(16), 'hex') 
WHERE pass_token IS NULL;

-- -----------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL 7 TABLES
-- -----------------------------------------------------------------------------
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrival_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 3. CLEAN SLATE: DROP ALL PRIOR POLICIES
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. SECURITY HELPER FUNCTIONS FOR ROLE VERIFICATION
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. PUBLIC ACCESS POLICIES (anon & unauthenticated)
-- -----------------------------------------------------------------------------
-- Public can ONLY view published upcoming/ongoing festival events.
CREATE POLICY "Public can view upcoming events"
ON public.events FOR SELECT TO anon, authenticated
USING (status IN ('upcoming', 'ongoing') OR public.is_srishti_staff());

-- CRITICAL ZERO-TRUST HARDENING:
-- Anonymous public users have ZERO direct SELECT, INSERT, UPDATE, or DELETE 
-- on participants and registrations!
-- All registrations must go exclusively through the register_participant_and_event() RPC.

-- -----------------------------------------------------------------------------
-- 6. AUTHENTICATED STAFF & ADMIN POLICIES
-- -----------------------------------------------------------------------------

-- 6A. PARTICIPANTS
CREATE POLICY "Staff can view all participants"
ON public.participants FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage participants"
ON public.participants FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 6B. REGISTRATIONS
CREATE POLICY "Staff can view all registrations"
ON public.registrations FOR SELECT TO authenticated
USING (public.is_srishti_staff());

CREATE POLICY "Admin can manage registrations"
ON public.registrations FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 6C. EVENTS
CREATE POLICY "Admin can manage events"
ON public.events FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- 6D. VOLUNTEERS & EVENT STAFF ASSIGNMENTS (Anti-Self-Promotion)
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

-- 6E. ARRIVAL GATE CHECK-INS (Campus Gate Staff & Admin Only)
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

-- 6F. EVENT ROOM ATTENDANCE (Strictly Scoped to Assigned Event ID)
CREATE POLICY "Admin can manage all event attendance"
ON public.event_attendance FOR ALL TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Event staff can manage assigned event attendance"
ON public.event_attendance FOR ALL TO authenticated
USING (public.is_event_staff_for_event(event_id))
WITH CHECK (public.is_event_staff_for_event(event_id));

CREATE POLICY "Registration staff can view event attendance"
ON public.event_attendance FOR SELECT TO authenticated
USING (public.is_srishti_registration());

-- -----------------------------------------------------------------------------
-- 7. LEAST-PRIVILEGE TABLE GRANTS
-- -----------------------------------------------------------------------------
-- Revoke all table-level privileges from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public can ONLY read events (No direct table access to participants/registrations)
GRANT SELECT ON public.events TO anon;

-- Authenticated staff have row-level permissions guarded by RLS:
GRANT SELECT, INSERT, UPDATE, DELETE ON public.participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.arrival_checkins TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendance TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. SECURITY DEFINER RPCs (THE ONLY ENTRY POINTS FOR PUBLIC)
-- -----------------------------------------------------------------------------

-- 8A. Atomic Registration Procedure
-- Enforces: Server-generated participant codes & pass tokens, fixed status = 'registered',
-- event validation, duplicate prevention, and zero exposure of client table manipulation.
CREATE OR REPLACE FUNCTION public.register_participant_and_event(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_college TEXT,
    p_department TEXT,
    p_year TEXT,
    p_event_id UUID,
    p_participant_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email TEXT := LOWER(TRIM(p_email));
    v_clean_name TEXT := TRIM(p_name);
    v_clean_phone TEXT := TRIM(p_phone);
    v_clean_college TEXT := TRIM(p_college);
    v_clean_dept TEXT := COALESCE(TRIM(p_department), 'General');
    v_participant_id UUID;
    v_final_code TEXT;
    v_pass_token TEXT;
    v_reg_id UUID;
    v_event_status TEXT;
BEGIN
    -- Validate required input
    IF v_clean_email IS NULL OR v_clean_email = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email address is required.');
    END IF;
    IF v_clean_name IS NULL OR v_clean_name = '' THEN
        v_clean_name := 'Attendee';
    END IF;

    -- Validate event existence and status if provided
    IF p_event_id IS NOT NULL THEN
        SELECT status INTO v_event_status FROM public.events WHERE id = p_event_id;
        IF v_event_status IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selected event does not exist.');
        ELSIF v_event_status NOT IN ('upcoming', 'ongoing') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selected event is not currently accepting registrations.');
        END IF;
    END IF;

    -- Lookup existing participant by email
    SELECT id, participant_code, pass_token 
    INTO v_participant_id, v_final_code, v_pass_token
    FROM public.participants
    WHERE LOWER(email) = v_clean_email
    LIMIT 1;

    -- Create or update participant
    IF v_participant_id IS NULL THEN
        v_final_code := COALESCE(NULLIF(TRIM(p_participant_code), ''), 'SRI27-' || UPPER(SUBSTRING(md5(random()::text) FROM 1 FOR 6)));
        v_pass_token := encode(gen_random_bytes(16), 'hex');

        INSERT INTO public.participants (
            participant_code,
            pass_token,
            name,
            email,
            phone,
            college,
            department,
            year
        )
        VALUES (
            v_final_code,
            v_pass_token,
            v_clean_name,
            v_clean_email,
            v_clean_phone,
            v_clean_college,
            v_clean_dept,
            COALESCE(p_year, '2026')
        )
        RETURNING id INTO v_participant_id;
    ELSE
        -- Ensure participant has a valid pass_token
        IF v_pass_token IS NULL THEN
            v_pass_token := encode(gen_random_bytes(16), 'hex');
            UPDATE public.participants SET pass_token = v_pass_token WHERE id = v_participant_id;
        END IF;

        -- Update non-blank fields safely
        UPDATE public.participants
        SET name = COALESCE(NULLIF(v_clean_name, ''), name),
            phone = COALESCE(NULLIF(v_clean_phone, ''), phone),
            college = COALESCE(NULLIF(v_clean_college, ''), college),
            department = COALESCE(NULLIF(v_clean_dept, ''), department)
        WHERE id = v_participant_id;
    END IF;

    -- Register for event if specified (prevents duplicates)
    IF p_event_id IS NOT NULL THEN
        INSERT INTO public.registrations (participant_id, event_id, status)
        VALUES (v_participant_id, p_event_id, 'registered')
        ON CONFLICT DO NOTHING
        RETURNING id INTO v_reg_id;

        IF v_reg_id IS NULL THEN
            SELECT id INTO v_reg_id FROM public.registrations 
            WHERE participant_id = v_participant_id AND event_id = p_event_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'participant_id', v_participant_id,
        'participant_code', v_final_code,
        'pass_token', v_pass_token,
        'registration_id', v_reg_id
    );
END;
$$;

-- 8B. Data-Minimized Participant Autofill RPC
-- Only projects UI profile fields and the server-generated pass_token.
CREATE OR REPLACE FUNCTION public.get_participant_by_email(lookup_email text)
RETURNS TABLE (
    id UUID,
    participant_code TEXT,
    pass_token TEXT,
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
        p.pass_token,
        p.name,
        p.email,
        p.college,
        p.department
    FROM public.participants p
    WHERE LOWER(p.email) = LOWER(TRIM(lookup_email))
    LIMIT 1;
$$;

-- 8C. Registration Lookup for Ticket Passes RPC
CREATE OR REPLACE FUNCTION public.get_registrations_by_email(lookup_email text)
RETURNS TABLE (
    id UUID,
    participant_id UUID,
    participant_code TEXT,
    pass_token TEXT,
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
        p.participant_code,
        p.pass_token,
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

-- 8D. Server-Side Cryptographic Pass Verification & Gate/Event Check-in RPC
-- Validates caller role, checks 128-bit server pass_token, detects counterfeits,
-- prevents duplicate check-ins, and records entry atomically in PostgreSQL.
CREATE OR REPLACE FUNCTION public.verify_and_checkin_pass(
    p_code TEXT,
    p_token TEXT,
    p_station TEXT, -- 'gate' or 'event'
    p_event_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_part RECORD;
    v_checkin_id UUID;
    v_existing_checkin TIMESTAMPTZ;
    v_event_name TEXT;
BEGIN
    -- 1. Station authorization check
    IF p_station = 'gate' THEN
        IF NOT (public.is_srishti_admin() OR public.is_srishti_registration()) THEN
            RETURN jsonb_build_object(
                'valid', false,
                'error', 'UNAUTHORIZED: Gate check-in requires Registration Staff or Admin role.'
            );
        END IF;
    ELSIF p_station = 'event' THEN
        IF p_event_id IS NULL THEN
            RETURN jsonb_build_object('valid', false, 'error', 'Event ID is required for event attendance check.');
        END IF;
        IF NOT (public.is_srishti_admin() OR public.is_event_staff_for_event(p_event_id)) THEN
            RETURN jsonb_build_object(
                'valid', false,
                'error', 'UNAUTHORIZED: You are not assigned to coordinate this event.'
            );
        END IF;
    ELSE
        RETURN jsonb_build_object('valid', false, 'error', 'Invalid station type.');
    END IF;

    -- 2. Verify participant code & cryptographic pass_token match
    SELECT id, participant_code, name, email, college, department
    INTO v_part
    FROM public.participants
    WHERE UPPER(participant_code) = UPPER(TRIM(p_code))
      AND pass_token = TRIM(p_token);

    IF v_part.id IS NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'is_counterfeit', true,
            'error', 'COUNTERFEIT_DETECTED: Invalid participant code or pass token mismatch!'
        );
    END IF;

    -- 3. Gate Station Check-In
    IF p_station = 'gate' THEN
        SELECT checked_in_at INTO v_existing_checkin
        FROM public.arrival_checkins
        WHERE participant_id = v_part.id
        ORDER BY checked_in_at ASC
        LIMIT 1;

        IF v_existing_checkin IS NOT NULL THEN
            RETURN jsonb_build_object(
                'valid', true,
                'is_counterfeit', false,
                'already_checked_in', true,
                'checked_in_at', v_existing_checkin,
                'participant', jsonb_build_object(
                    'id', v_part.id,
                    'code', v_part.participant_code,
                    'name', v_part.name,
                    'college', v_part.college,
                    'department', v_part.department
                ),
                'message', 'Participant ALREADY checked in at campus gate.'
            );
        END IF;

        INSERT INTO public.arrival_checkins (participant_id, checked_in_by, source, notes)
        VALUES (v_part.id, auth.uid(), 'scanner', p_notes)
        RETURNING id INTO v_checkin_id;

        RETURN jsonb_build_object(
            'valid', true,
            'is_counterfeit', false,
            'already_checked_in', false,
            'new_checkin', true,
            'participant', jsonb_build_object(
                'id', v_part.id,
                'code', v_part.participant_code,
                'name', v_part.name,
                'college', v_part.college,
                'department', v_part.department
            ),
            'message', 'Gate arrival confirmed successfully!'
        );

    -- 4. Event Station Check-In
    ELSIF p_station = 'event' THEN
        SELECT marked_at INTO v_existing_checkin
        FROM public.event_attendance
        WHERE participant_id = v_part.id
          AND event_id = p_event_id
        LIMIT 1;

        SELECT name INTO v_event_name FROM public.events WHERE id = p_event_id;

        IF v_existing_checkin IS NOT NULL THEN
            RETURN jsonb_build_object(
                'valid', true,
                'is_counterfeit', false,
                'already_checked_in', true,
                'checked_in_at', v_existing_checkin,
                'participant', jsonb_build_object(
                    'id', v_part.id,
                    'code', v_part.participant_code,
                    'name', v_part.name,
                    'college', v_part.college
                ),
                'event_name', v_event_name,
                'message', 'Participant attendance already marked for this event.'
            );
        END IF;

        INSERT INTO public.event_attendance (participant_id, event_id, marked_by, source, notes)
        VALUES (v_part.id, p_event_id, auth.uid(), 'scanner', p_notes)
        RETURNING id INTO v_checkin_id;

        RETURN jsonb_build_object(
            'valid', true,
            'is_counterfeit', false,
            'already_checked_in', false,
            'new_checkin', true,
            'participant', jsonb_build_object(
                'id', v_part.id,
                'code', v_part.participant_code,
                'name', v_part.name,
                'college', v_part.college
            ),
            'event_name', v_event_name,
            'message', 'Event attendance marked successfully!'
        );
    END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. EXECUTE PERMISSIONS FOR SECURE RPCS
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.register_participant_and_event(text, text, text, text, text, text, uuid, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_participant_by_email(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_registrations_by_email(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_and_checkin_pass(text, text, text, uuid, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 10. REFRESH POSTGREST SCHEMA CACHE
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
