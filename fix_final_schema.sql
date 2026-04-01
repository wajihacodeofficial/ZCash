-- FINAL SCHEMA CONSOLIDATION & FIX
-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR TO RESOLVE 400 ERRORS

-- 1. Ensure 'transactions' table has all required columns
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS request_number TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- 2. Ensure 'user_plans' has created_at for sorting/admin purposes
ALTER TABLE public.user_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Ensure 'profiles' table has all expected columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 4. Enable Realtime for key tables (Reserves WebSocket established failure)
-- Note: This requires the Superuser or proper permissions, usually works in SQL Editor
BEGIN;
  -- Remove existing publications for these tables if they exist to avoid conflicts
  ALTER TABLE public.transactions REPLICA IDENTITY FULL;
  ALTER TABLE public.user_plans REPLICA IDENTITY FULL;
  ALTER TABLE public.plans REPLICA IDENTITY FULL;
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;

  -- Add to the supabase_realtime publication
  -- Check if publication exists first
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.user_plans;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.plans;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if tables are already in publication
  END $$;
COMMIT;

-- 5. Fix potential RLS issues by ensuring admins can bypass
-- This ensures the 'AdminProofsPage' and other admin tools can fetch data
DROP POLICY IF EXISTS "Admins can view everything" ON public.transactions;
CREATE POLICY "Admins can view everything" ON public.transactions FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'ADMIN')));

-- 6. Final schema cache reload hint
-- Executing any DDL (ALTER TABLE) automatically signals PostgREST to reload the schema cache.
-- No further action usually needed.
