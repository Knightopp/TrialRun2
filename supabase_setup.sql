-- ==============================================================================
-- SRISHTI 2.7 - COMPREHENSIVE DATABASE SCHEMA, ROLE RLS & EVENT ASSIGNMENTS
-- Target: Supabase PostgreSQL (abpbucekqzvrueqwaqqw.supabase.co)
-- ==============================================================================
-- Roles:
--   1. admin         -> Full management of all festival operations & database
--   2. registration  -> Campus gate check-ins (arrival_checkins) & participant verification
--   3. event_staff   -> Event room coordinators (event_attendance for assigned events)
--   4. volunteer     -> General festival support & profile
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. CORE TABLES
-- ==============================================================================

-- 1A. PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    college TEXT,
    department TEXT,
    year TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist if table was previously partially created
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS participant_code TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS college TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- 1B. EVENTS
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME,
    end_time TIME,
    venue TEXT,
    capacity INTEGER,
    status TEXT NOT NULL DEFAULT 'upcoming',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT events_status_check
        CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),

    CONSTRAINT events_capacity_check
        CHECK (capacity IS NULL OR capacity > 0)
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS event_code TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS venue TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS capacity INTEGER;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming';
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- 1C. REGISTRATIONS
CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL
        REFERENCES public.participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL
        REFERENCES public.events(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'registered',
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT registrations_status_check
        CHECK (status IN ('registered', 'cancelled', 'waitlisted')),

    CONSTRAINT registrations_unique_participant_event
        UNIQUE (participant_id, event_id)
);

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS participant_id UUID;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS event_id UUID;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'registered';
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();


-- 1D. VOLUNTEERS
CREATE TABLE IF NOT EXISTS public.volunteers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE
        REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'volunteer',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'volunteer';
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.volunteers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update constraint on volunteers role to allow all 4 official roles
DO $$
BEGIN
  ALTER TABLE public.volunteers DROP CONSTRAINT IF EXISTS volunteers_role_check;
  ALTER TABLE public.volunteers ADD CONSTRAINT volunteers_role_check
    CHECK (role IN ('admin', 'registration', 'event_staff', 'volunteer'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Update constraint on volunteers status
DO $$
BEGIN
  ALTER TABLE public.volunteers DROP CONSTRAINT IF EXISTS volunteers_status_check;
  ALTER TABLE public.volunteers ADD CONSTRAINT volunteers_status_check
    CHECK (status IN ('active', 'inactive'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;


-- 1E. EVENT STAFF ASSIGNMENTS (Coordinator assignments to events)
CREATE TABLE IF NOT EXISTS public.event_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    volunteer_id UUID NOT NULL
        REFERENCES public.volunteers(id) ON DELETE CASCADE,
    event_id UUID NOT NULL
        REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (volunteer_id, event_id)
);


-- 1F. ARRIVAL CHECK-INS (Gate verification)
CREATE TABLE IF NOT EXISTS public.arrival_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL
        REFERENCES public.participants(id) ON DELETE CASCADE,
    checked_in_by UUID NOT NULL
        REFERENCES public.volunteers(id),
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'qr',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT arrival_checkins_source_check
        CHECK (source IN ('qr', 'manual')),

    CONSTRAINT arrival_checkins_unique_participant
        UNIQUE (participant_id)
);


-- 1G. EVENT ATTENDANCE (Room / competition attendance)
CREATE TABLE IF NOT EXISTS public.event_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL
        REFERENCES public.participants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL
        REFERENCES public.events(id) ON DELETE CASCADE,
    marked_by UUID NOT NULL
        REFERENCES public.volunteers(id),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'qr',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT event_attendance_source_check
        CHECK (source IN ('qr', 'manual')),

    CONSTRAINT event_attendance_unique_participant_event
        UNIQUE (participant_id, event_id)
);


-- ==============================================================================
-- 2. INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_participants_name ON public.participants(name);
CREATE INDEX IF NOT EXISTS idx_participants_phone ON public.participants(phone);
CREATE INDEX IF NOT EXISTS idx_participants_email ON public.participants(email);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_events_event_code ON public.events(event_code);
CREATE INDEX IF NOT EXISTS idx_registrations_participant ON public.registrations(participant_id);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON public.registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_arrival_checkins_participant ON public.arrival_checkins(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_participant ON public.event_attendance(participant_id);
CREATE INDEX IF NOT EXISTS idx_event_attendance_event ON public.event_attendance(event_id);

CREATE UNIQUE INDEX IF NOT EXISTS volunteers_username_unique
ON public.volunteers (username)
WHERE username IS NOT NULL;


-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) HELPER FUNCTIONS
-- ==============================================================================

-- Check whether current user is active SRISHTI staff (any role)
CREATE OR REPLACE FUNCTION public.is_srishti_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role IN ('admin', 'registration', 'event_staff', 'volunteer')
    );
$$;

-- Check whether current user is an admin
CREATE OR REPLACE FUNCTION public.is_srishti_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'admin'
    );
$$;

-- Check whether current user is in registration desk team
CREATE OR REPLACE FUNCTION public.is_srishti_registration()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'registration'
    );
$$;

-- Check whether current user is event staff assigned to target event
CREATE OR REPLACE FUNCTION public.is_event_staff_for_event(target_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.volunteers v
        JOIN public.event_staff es
            ON es.volunteer_id = v.id
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'event_staff'
          AND es.event_id = target_event_id
    );
$$;


-- ==============================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================================================
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrival_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;


-- ==============================================================================
-- 5. CLEAN UP PRIOR BROAD POLICIES
-- ==============================================================================
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


-- ==============================================================================
-- 6. ROLE-BASED RLS POLICIES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 6A. EVENT STAFF ASSIGNMENTS (event_staff)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can manage event staff"
ON public.event_staff
FOR ALL
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Staff can view own event assignments"
ON public.event_staff
FOR SELECT
TO authenticated
USING (
    volunteer_id IN (
        SELECT v.id
        FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
    )
);


-- ------------------------------------------------------------------------------
-- 6B. EVENTS (events)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can create events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Admin can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Admin can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (public.is_srishti_admin());

CREATE POLICY "Admin can view all events"
ON public.events
FOR SELECT
TO authenticated
USING (public.is_srishti_admin());

CREATE POLICY "Event staff can view assigned events"
ON public.events
FOR SELECT
TO authenticated
USING (public.is_event_staff_for_event(id));

CREATE POLICY "Registration volunteers can view events"
ON public.events
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.volunteers
        WHERE volunteers.auth_user_id = auth.uid()
          AND volunteers.role IN ('registration', 'admin')
          AND volunteers.status = 'active'
    )
);

-- Public Policy: unauthenticated website visitors can browse upcoming festival events
CREATE POLICY "Public can view upcoming events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (status IN ('upcoming', 'ongoing'));


-- ------------------------------------------------------------------------------
-- 6C. PARTICIPANTS (participants)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can view all participants"
ON public.participants
FOR SELECT
TO authenticated
USING (public.is_srishti_admin());

CREATE POLICY "Registration can view registered participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
    public.is_srishti_registration()
    AND EXISTS (
        SELECT 1
        FROM public.registrations r
        WHERE r.participant_id = participants.id
    )
);

CREATE POLICY "Event staff can view assigned event participants"
ON public.participants
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.registrations r
        WHERE r.participant_id = participants.id
          AND public.is_event_staff_for_event(r.event_id)
    )
);

CREATE POLICY "Admin can modify participants"
ON public.participants
FOR ALL
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

-- Public Registration Policy: Allows self-service festival attendee registration
CREATE POLICY "Public can register participant"
ON public.participants
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can view own participant profile"
ON public.participants
FOR SELECT
TO anon, authenticated
USING (true);


-- ------------------------------------------------------------------------------
-- 6D. REGISTRATIONS (registrations)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can manage registrations"
ON public.registrations
FOR ALL
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Registration can view registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (public.is_srishti_registration());

CREATE POLICY "Event staff can view assigned registrations"
ON public.registrations
FOR SELECT
TO authenticated
USING (public.is_event_staff_for_event(event_id));

-- Public Registration Policy: Allows attendee to submit event registration
CREATE POLICY "Public can create registrations"
ON public.registrations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can view registrations"
ON public.registrations
FOR SELECT
TO anon, authenticated
USING (true);


-- ------------------------------------------------------------------------------
-- 6E. ARRIVAL CHECK-INS (arrival_checkins)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can manage arrival check-ins"
ON public.arrival_checkins
FOR ALL
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Registration can view arrival check-ins"
ON public.arrival_checkins
FOR SELECT
TO authenticated
USING (public.is_srishti_registration());

CREATE POLICY "Registration can create arrival check-ins"
ON public.arrival_checkins
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_srishti_registration()
    AND checked_in_by IN (
        SELECT v.id
        FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'registration'
    )
);

CREATE POLICY "Event staff can view assigned participant arrivals"
ON public.arrival_checkins
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.registrations r
        WHERE r.participant_id = arrival_checkins.participant_id
          AND public.is_event_staff_for_event(r.event_id)
    )
);


-- ------------------------------------------------------------------------------
-- 6F. EVENT ATTENDANCE (event_attendance)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can manage event attendance"
ON public.event_attendance
FOR ALL
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Event staff can view assigned attendance"
ON public.event_attendance
FOR SELECT
TO authenticated
USING (public.is_event_staff_for_event(event_id));

CREATE POLICY "Event staff can create assigned attendance"
ON public.event_attendance
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_event_staff_for_event(event_id)
    AND marked_by IN (
        SELECT v.id
        FROM public.volunteers v
        WHERE v.auth_user_id = auth.uid()
          AND v.status = 'active'
          AND v.role = 'event_staff'
    )
);


-- ------------------------------------------------------------------------------
-- 6G. VOLUNTEERS (volunteers)
-- ------------------------------------------------------------------------------
CREATE POLICY "Admin can view all volunteers"
ON public.volunteers
FOR SELECT
TO authenticated
USING (public.is_srishti_admin());

CREATE POLICY "Users can view own volunteer profile"
ON public.volunteers
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

CREATE POLICY "Admin can create volunteers"
ON public.volunteers
FOR INSERT
TO authenticated
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Admin can update volunteers"
ON public.volunteers
FOR UPDATE
TO authenticated
USING (public.is_srishti_admin())
WITH CHECK (public.is_srishti_admin());

CREATE POLICY "Admin can delete volunteers"
ON public.volunteers
FOR DELETE
TO authenticated
USING (public.is_srishti_admin());


-- ==============================================================================
-- 7. SEED DATA: OFFICIAL SRISHTI 2.7 FESTIVAL EVENTS
-- ==============================================================================
INSERT INTO public.events (
    event_code,
    name,
    category,
    date,
    start_time,
    end_time,
    venue,
    status
)
VALUES
    ('SRI27-TREASURE', 'Treasure Hunt', 'Fun',
     '2026-12-10', '10:00', '12:00', 'College Campus', 'upcoming'),

    ('SRI27-WALTZ', 'Waltz', 'Cultural',
     '2026-12-10', '14:00', '16:00', 'Main Auditorium', 'upcoming'),

    ('SRI27-QUIZ', 'Quiz', 'Technical',
     '2026-12-10', '10:00', '12:00', 'Seminar Hall', 'upcoming'),

    ('SRI27-CODE', 'Coding and Debugging', 'Technical',
     '2026-12-11', '10:00', '12:00', 'Computer Lab', 'upcoming'),

    ('SRI27-TRACEBOT', 'Tracebot', 'Technical',
     '2026-12-11', '13:00', '15:00', 'CS Lab', 'upcoming'),

    ('SRI27-RELAY', 'Relay Coding', 'Technical',
     '2026-12-11', '10:00', '12:00', 'Computer Lab', 'upcoming')

ON CONFLICT (event_code)
DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    date = EXCLUDED.date,
    start_time = EXCLUDED.start_time,
    end_time = EXCLUDED.end_time,
    venue = EXCLUDED.venue,
    status = EXCLUDED.status;


-- ==============================================================================
-- 8. SEED DATA: TEST PARTICIPANTS & SAMPLE REGISTRATIONS
-- ==============================================================================
INSERT INTO public.participants (
    participant_code,
    name,
    email,
    phone,
    college,
    department,
    year
)
VALUES
    ('TEST-SRI27-001', 'Adarsh Menon', 'adarsh@stthomas.edu', '+91 98471 23456', 'St. Thomas College Thrissur', 'Computer Science', '3rd Year'),
    ('TEST-SRI27-002', 'Devika Nair', 'devika@stthomas.edu', '+91 98471 65432', 'St. Thomas College Thrissur', 'Computer Applications', '2nd Year'),
    ('SRI27-ADMIN', 'Master Admin', 'tsrknight@gmail.com', '+91 99999 99999', 'Srishti HQ', 'Administration', 'Faculty')
ON CONFLICT (participant_code)
DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    college = EXCLUDED.college;

-- Link test participants to events
INSERT INTO public.registrations (participant_id, event_id, status)
SELECT p.id, e.id, 'registered'
FROM public.participants p
CROSS JOIN public.events e
WHERE p.participant_code = 'TEST-SRI27-002'
  AND e.event_code IN ('SRI27-QUIZ', 'SRI27-TREASURE')
ON CONFLICT (participant_id, event_id) DO NOTHING;

INSERT INTO public.registrations (participant_id, event_id, status)
SELECT p.id, e.id, 'registered'
FROM public.participants p
CROSS JOIN public.events e
WHERE p.participant_code = 'TEST-SRI27-001'
  AND e.event_code IN ('SRI27-CODE', 'SRI27-TRACEBOT', 'SRI27-RELAY')
ON CONFLICT (participant_id, event_id) DO NOTHING;


-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
