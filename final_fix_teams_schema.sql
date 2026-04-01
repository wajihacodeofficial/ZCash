-- FINAL FOOLPROOF FIX FOR TEAMS TABLE
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX 400 ERRORS AND RELOAD CACHE

ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS total_deposit DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS live_profit DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);

ALTER TABLE public.teams DROP CONSTRAINT IF EXISTS teams_status_check;
ALTER TABLE public.teams ADD CONSTRAINT teams_status_check CHECK (status IN ('pending', 'approved', 'deleted'));

GRANT ALL ON TABLE public.teams TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
