-- ==============================================================================
-- SRISHTI 2.7 Migration: Allow Authenticated Participant Profile Self-Service Creation
-- Target Project: sdkadflrxjdhxduwvrsz
-- ==============================================================================

BEGIN;

-- Allow authenticated users to insert their own participant profile with matching email
DROP POLICY IF EXISTS "Participants can create own profile" ON public.participants;
CREATE POLICY "Participants can create own profile" ON public.participants
  FOR INSERT TO authenticated
  WITH CHECK (
    (LOWER(email) = LOWER(auth.jwt() ->> 'email'))
    OR (email = (auth.jwt() ->> 'email'))
  );

GRANT INSERT ON TABLE public.participants TO authenticated;

COMMIT;
