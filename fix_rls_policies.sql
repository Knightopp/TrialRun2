-- ==============================================================================
-- SRISHTI 2.7 — PRODUCTION ZERO-TRUST SECURITY & RLS ARCHITECTURE (V6 FINAL)
-- ==============================================================================
-- Addressed Security Verifications (Audit V6):
-- 1. CONCURRENCY RACE CONDITION FIXED: Unique constraints on arrival_checkins and 
--    event_attendance with atomic ON CONFLICT DO NOTHING. Prevents double-scans across gates.
-- 2. EMAIL VERIFICATION ENFORCED: link_participant_to_auth() verifies email_confirmed_at
--    directly against auth.users in PostgreSQL.
-- 3. ZERO PUBLIC PII LEAKS: get_participant_by_email and get_registrations_by_email 
--    REVOKED from anon. Public cannot query names, colleges, or registered events.
-- 4. IDENTITY-BASED USER LOOKUPS: Replaced with get_my_participant() and get_my_registrations()
--    strictly bounded to WHERE auth_user_id = auth.uid().
-- 5. EVENT ATTENDANCE REGISTRATION VERIFICATION: Rejects attendees not registered for event.
-- 6. STRICT PASS CREDENTIAL RETRIEVAL: get_my_pass_credential() strictly matches auth_user_id.
-- ==============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. SCHEMA HARDENING, EXTENSIONS & UNIQUE CONSTRAINTS
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure pass_token and auth_user_id columns exist
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS pass_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex');

ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Backfill any existing participants missing pass_token
UPDATE public.participants 
SET pass_token = encode(gen_random_bytes(16), 'hex') 
WHERE pass_token IS NULL;

-- CRITICAL FIX: Database-level unique constraints to eliminate scanner race conditions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'arrival_checkins_unique_participant'
    ) THEN
        ALTER TABLE public.arrival_checkins 
        ADD CONSTRAINT arrival_checkins_unique_participant UNIQUE (participant_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'event_attendance_unique_participant_event'
    ) THEN
        ALTER TABLE public.event_attendance 
        ADD CONSTRAINT event_attendance_unique_participant_event UNIQUE (participant_id, event_id);
    END IF;
END $$;

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
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_srishti_registration()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'registration'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_srishti_staff()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role IN ('admin', 'registration', 'event_staff')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_event_staff_for_event(target_event_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
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

-- ZERO-TRUST ENFORCEMENT:
-- Anonymous public users have ZERO direct SELECT, INSERT, UPDATE, or DELETE 
-- on participants, registrations, volunteers, event_staff, checkins, or attendance.

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
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Public can ONLY read published events
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
-- 8. SECURITY DEFINER RPCs (THE ONLY ENTRY POINTS FOR USERS)
-- -----------------------------------------------------------------------------

-- 8A. Atomic Registration Procedure
CREATE OR REPLACE FUNCTION public.register_participant_and_event(
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_college TEXT,
    p_department TEXT,
    p_year TEXT,
    p_event_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
    v_existing_auth_id UUID;
    v_reg_id UUID;
    v_event_status TEXT;
    v_email_is_confirmed BOOLEAN := false;
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
    SELECT id, participant_code, pass_token, auth_user_id
    INTO v_participant_id, v_final_code, v_pass_token, v_existing_auth_id
    FROM public.participants
    WHERE LOWER(email) = v_clean_email
    LIMIT 1;

    -- CASE 1: Brand new participant
    IF v_participant_id IS NULL THEN
        -- Server generates participant_code: 'SRI27-' + 6 uppercase hex chars
        v_final_code := 'SRI27-' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 6));
        -- Server generates 128-bit secret pass_token
        v_pass_token := encode(gen_random_bytes(16), 'hex');

        INSERT INTO public.participants (
            participant_code,
            pass_token,
            auth_user_id,
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
            auth.uid(), -- Link auth.uid() if authenticated session exists
            v_clean_name,
            v_clean_email,
            v_clean_phone,
            v_clean_college,
            v_clean_dept,
            COALESCE(p_year, '2026')
        )
        RETURNING id INTO v_participant_id;

        -- Create registration if event specified
        IF p_event_id IS NOT NULL THEN
            INSERT INTO public.registrations (participant_id, event_id, status)
            VALUES (v_participant_id, p_event_id, 'registered')
            RETURNING id INTO v_reg_id;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'is_new', true,
            'participant_id', v_participant_id,
            'participant_code', v_final_code,
            'pass_token', v_pass_token,
            'registration_id', v_reg_id,
            'message', 'Registration successful! Your digital pass has been generated.'
        );

    -- CASE 2: Participant already exists
    ELSE
        -- 2A. ANONYMOUS CALLER CHECK:
        -- Anonymous callers CANNOT modify someone else's existing profile or register on their behalf!
        IF auth.uid() IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'is_existing', true,
                'error', 'This email is already registered. Please sign in to your profile to register for additional events.'
            );
        END IF;

        -- 2B. AUTHENTICATED CALLER OWNERSHIP CHECK:
        -- If record is already claimed by a different account, reject!
        IF v_existing_auth_id IS NOT NULL AND v_existing_auth_id <> auth.uid() THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Unauthorized: You do not own this participant record.'
            );
        END IF;

        -- 2C. If unowned, verify caller's email is confirmed in auth.users
        IF v_existing_auth_id IS NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users u
                WHERE u.id = auth.uid()
                  AND u.email_confirmed_at IS NOT NULL
                  AND LOWER(u.email) = v_clean_email
            ) INTO v_email_is_confirmed;

            IF NOT v_email_is_confirmed THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', 'Email confirmation required to link this participant record.'
                );
            END IF;

            UPDATE public.participants SET auth_user_id = auth.uid() WHERE id = v_participant_id;
        END IF;

        -- Verified owner: update profile fields safely
        UPDATE public.participants
        SET name = COALESCE(NULLIF(v_clean_name, ''), name),
            phone = COALESCE(NULLIF(v_clean_phone, ''), phone),
            college = COALESCE(NULLIF(v_clean_college, ''), college),
            department = COALESCE(NULLIF(v_clean_dept, ''), department)
        WHERE id = v_participant_id;

        -- Register for additional event
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
            'is_new', false,
            'participant_id', v_participant_id,
            'participant_code', v_final_code,
            'pass_token', v_pass_token,
            'registration_id', v_reg_id,
            'message', 'Registration confirmed for additional event.'
        );
    END IF;
END;
$$;

-- 8B. Identity-Based Authenticated Participant Profile RPC (REPLACES PUBLIC EMAIL LOOKUP)
-- Zero PII disclosure to anonymous users. Only authenticated user can retrieve their own profile.
CREATE OR REPLACE FUNCTION public.get_my_participant()
RETURNS TABLE (
    id UUID,
    participant_code TEXT,
    name TEXT,
    email TEXT,
    college TEXT,
    department TEXT,
    phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id, participant_code, name, email, college, department, phone
    FROM public.participants
    WHERE auth_user_id = auth.uid()
    LIMIT 1;
$$;

-- 8C. Identity-Based Authenticated Registrations List RPC (REPLACES PUBLIC EMAIL LOOKUP)
-- Zero PII disclosure to anonymous users. Only authenticated user can retrieve their tickets.
CREATE OR REPLACE FUNCTION public.get_my_registrations()
RETURNS TABLE (
    id UUID,
    participant_id UUID,
    participant_code TEXT,
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
SET search_path = public, pg_temp
AS $$
    SELECT 
        r.id,
        r.participant_id,
        p.participant_code,
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
    WHERE p.auth_user_id = auth.uid();
$$;

-- 8D. Identity-Based Authenticated Pass Credential RPC (STRICT auth.uid() ONLY)
CREATE OR REPLACE FUNCTION public.get_my_pass_credential()
RETURNS TABLE (
    participant_code TEXT,
    pass_token TEXT,
    name TEXT,
    college TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT p.participant_code, p.pass_token, p.name, p.college
    FROM public.participants p
    WHERE p.auth_user_id = auth.uid()
    LIMIT 1;
$$;

-- 8E. Explicit Account Claiming Flow with auth.users Email Confirmation Check
CREATE OR REPLACE FUNCTION public.link_participant_to_auth()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_email TEXT;
    v_participant_id UUID;
    v_existing_auth UUID;
    v_is_confirmed BOOLEAN := false;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Must be authenticated to link account.');
    END IF;

    -- Verify directly in auth.users ground truth table that email is confirmed
    SELECT email, (email_confirmed_at IS NOT NULL) INTO v_user_email, v_is_confirmed
    FROM auth.users
    WHERE id = auth.uid();

    IF v_user_email IS NULL OR NOT v_is_confirmed THEN
        RETURN jsonb_build_object('success', false, 'error', 'Email address has not been confirmed yet.');
    END IF;

    SELECT id, auth_user_id INTO v_participant_id, v_existing_auth
    FROM public.participants
    WHERE LOWER(email) = LOWER(v_user_email)
    LIMIT 1;

    IF v_participant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No participant record found for this verified email.');
    END IF;

    IF v_existing_auth IS NOT NULL AND v_existing_auth <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'This participant record is already linked to another account.');
    END IF;

    UPDATE public.participants
    SET auth_user_id = auth.uid()
    WHERE id = v_participant_id;

    RETURN jsonb_build_object('success', true, 'message', 'Participant profile successfully linked to your authenticated account.');
END;
$$;

-- 8F. Staff-Only Email Lookup RPCs (Guarded by is_srishti_staff)
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
SET search_path = public, pg_temp
AS $$
    SELECT p.id, p.participant_code, p.name, p.email, p.college, p.department
    FROM public.participants p
    WHERE LOWER(p.email) = LOWER(TRIM(lookup_email))
      AND (public.is_srishti_staff() OR auth.jwt() ->> 'role' = 'service_role')
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_registrations_by_email(lookup_email text)
RETURNS TABLE (
    id UUID,
    participant_id UUID,
    participant_code TEXT,
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
SET search_path = public, pg_temp
AS $$
    SELECT 
        r.id,
        r.participant_id,
        p.participant_code,
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
    WHERE LOWER(p.email) = LOWER(TRIM(lookup_email))
      AND (public.is_srishti_staff() OR auth.jwt() ->> 'role' = 'service_role');
$$;

-- 8G. Concurrency-Safe Server Cryptographic Pass Verification & Check-in RPC
-- Atomic ON CONFLICT DO NOTHING eliminates scanner race conditions.
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
SET search_path = public, pg_temp
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

    -- 3. Gate Station Check-In (ATOMIC CONCURRENCY-SAFE)
    IF p_station = 'gate' THEN
        -- Atomic insert with conflict handling prevents concurrent race condition
        INSERT INTO public.arrival_checkins (participant_id, checked_in_by, source, notes)
        VALUES (v_part.id, auth.uid(), 'scanner', p_notes)
        ON CONFLICT (participant_id) DO NOTHING
        RETURNING id INTO v_checkin_id;

        -- If v_checkin_id is NULL, attendee was ALREADY checked in!
        IF v_checkin_id IS NULL THEN
            SELECT checked_in_at INTO v_existing_checkin
            FROM public.arrival_checkins
            WHERE participant_id = v_part.id;

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

    -- 4. Event Station Check-In (ATOMIC CONCURRENCY-SAFE)
    ELSIF p_station = 'event' THEN
        -- Verify attendee is registered for this event
        IF NOT EXISTS (
            SELECT 1
            FROM public.registrations r
            WHERE r.participant_id = v_part.id
              AND r.event_id = p_event_id
              AND r.status IN ('registered', 'confirmed', 'verified', 'paid')
        ) THEN
            RETURN jsonb_build_object(
                'valid', false,
                'is_not_registered', true,
                'error', 'ACCESS_DENIED: Participant is not registered for this event.'
            );
        END IF;

        SELECT name INTO v_event_name FROM public.events WHERE id = p_event_id;

        -- Atomic insert with conflict handling prevents concurrent race condition
        INSERT INTO public.event_attendance (participant_id, event_id, marked_by, source, notes)
        VALUES (v_part.id, p_event_id, auth.uid(), 'scanner', p_notes)
        ON CONFLICT (participant_id, event_id) DO NOTHING
        RETURNING id INTO v_checkin_id;

        -- If v_checkin_id is NULL, attendee was ALREADY recorded for this event!
        IF v_checkin_id IS NULL THEN
            SELECT marked_at INTO v_existing_checkin
            FROM public.event_attendance
            WHERE participant_id = v_part.id
              AND event_id = p_event_id;

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
-- 9. LEAST-PRIVILEGE EXECUTE PERMISSIONS
-- -----------------------------------------------------------------------------
-- Public RPC: Only registration creation is public
GRANT EXECUTE ON FUNCTION public.register_participant_and_event(text, text, text, text, text, text, uuid) TO anon, authenticated, service_role;

-- Authenticated Attendee RPCs: User retrieves only their own records
REVOKE EXECUTE ON FUNCTION public.get_my_participant() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_participant() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_registrations() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_registrations() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_my_pass_credential() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_pass_credential() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.link_participant_to_auth() FROM anon;
GRANT EXECUTE ON FUNCTION public.link_participant_to_auth() TO authenticated, service_role;

-- Staff-Only RPCs: Revoked from anon completely
REVOKE EXECUTE ON FUNCTION public.get_participant_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_participant_by_email(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_registrations_by_email(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_registrations_by_email(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.verify_and_checkin_pass(text, text, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.verify_and_checkin_pass(text, text, text, uuid, text) TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 10. REFRESH POSTGREST SCHEMA CACHE
-- -----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
