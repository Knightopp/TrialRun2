-- REVIEW DRAFT ONLY - for Supabase project sdkadflrxjdhxduwvrsz.
-- Removes the observed broad public policies without changing the core schema,
-- staff helper functions, scoped staff policies, or any existing data.
-- Do not run against the original SRISHTI production project.

BEGIN;

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arrival_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access for participants" ON public.participants;
DROP POLICY IF EXISTS "Public access for volunteers" ON public.volunteers;
DROP POLICY IF EXISTS "Public access for event_staff" ON public.event_staff;
DROP POLICY IF EXISTS "Public access for registrations" ON public.registrations;
DROP POLICY IF EXISTS "Public access for arrival_checkins" ON public.arrival_checkins;
DROP POLICY IF EXISTS "Public access for event_attendance" ON public.event_attendance;

-- The audit also found anonymous event-management policies. Keep the public
-- event-list SELECT policy; remove only public writes and deletes.
DROP POLICY IF EXISTS "Public admin can delete events" ON public.events;
DROP POLICY IF EXISTS "Public admin can insert events" ON public.events;
DROP POLICY IF EXISTS "Public admin can update events" ON public.events;

-- RLS controls rows, while grants control table reachability through the API.
REVOKE ALL ON TABLE public.participants FROM anon;
REVOKE ALL ON TABLE public.volunteers FROM anon;
REVOKE ALL ON TABLE public.event_staff FROM anon;
REVOKE ALL ON TABLE public.registrations FROM anon;
REVOKE ALL ON TABLE public.arrival_checkins FROM anon;
REVOKE ALL ON TABLE public.event_attendance FROM anon;
REVOKE ALL ON TABLE public.events FROM anon;
GRANT SELECT ON TABLE public.events TO anon;

COMMIT;
