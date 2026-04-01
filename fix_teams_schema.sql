-- CONSOLIDATED TEAMS SCHEMA FIX
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX 400/406 ERRORS ON TEAMS PAGE

-- 1. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    total_deposit DECIMAL(10, 2) DEFAULT 0.00,
    live_profit DECIMAL(10, 2) DEFAULT 0.00,
    score INTEGER DEFAULT 0,
    owner_id UUID REFERENCES public.profiles(id),
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Team Requests Table
CREATE TABLE IF NOT EXISTS public.team_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_name TEXT,
    request_type TEXT CHECK (request_type IN ('create', 'delete')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Team Messages Table
CREATE TABLE IF NOT EXISTS public.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Team Member Requests Table (For inviting members)
CREATE TABLE IF NOT EXISTS public.team_member_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Add team_id to Profiles if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- 6. Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_requests ENABLE ROW LEVEL SECURITY;

-- 7. Policies
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own team requests" ON public.team_requests;
CREATE POLICY "Users can view own team requests" ON public.team_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert team requests" ON public.team_requests;
CREATE POLICY "Users can insert team requests" ON public.team_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;
CREATE POLICY "Team members can view messages" ON public.team_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = team_messages.team_id));

DROP POLICY IF EXISTS "Team members can send messages" ON public.team_messages;
CREATE POLICY "Team members can send messages" ON public.team_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = team_id));

-- 8. Enable Realtime
BEGIN;
  ALTER TABLE public.teams REPLICA IDENTITY FULL;
  ALTER TABLE public.team_messages REPLICA IDENTITY FULL;
  
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END $$;
COMMIT;
