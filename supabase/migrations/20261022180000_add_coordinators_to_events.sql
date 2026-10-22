-- ==============================================================================
-- SRISHTI 2.7 Migration: Add coordinators column to events table
-- Target Project: sdkadflrxjdhxduwvrsz
-- ==============================================================================

BEGIN;

-- Add coordinators jsonb column if it does not already exist
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS coordinators jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.events.coordinators IS 'List of public event coordinators with name and phone';

COMMIT;
