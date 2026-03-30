-- Migration: Create password_reset_otps table for Forgot Password OTP flow

CREATE TABLE IF NOT EXISTS public.password_reset_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON public.password_reset_otps(email);

-- No RLS needed — this table is ONLY accessed from server-side API routes using the service role key.
-- Enabling RLS with no user policies ensures no client can access it directly.
ALTER TABLE public.password_reset_otps ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete OTPs older than 1 hour to keep table clean
-- (Optional: can also be done via a cron job or pg_cron)
