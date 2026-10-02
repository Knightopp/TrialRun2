-- Create OTP codes table for 4-digit custom email authentication
CREATE TABLE IF NOT EXISTS otp_codes (
    email TEXT PRIMARY KEY,
    code VARCHAR(4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read/write access so the React client can generate, store, and verify codes.
-- In a production environment with sensitive data, you'd secure this with RLS or edge functions.
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert to otp_codes" 
ON otp_codes FOR INSERT 
TO public 
WITH CHECK (true);

CREATE POLICY "Allow public select on otp_codes" 
ON otp_codes FOR SELECT 
TO public 
USING (true);

CREATE POLICY "Allow public update to otp_codes" 
ON otp_codes FOR UPDATE 
TO public 
USING (true);

CREATE POLICY "Allow public delete on otp_codes" 
ON otp_codes FOR DELETE 
TO public 
USING (true);
