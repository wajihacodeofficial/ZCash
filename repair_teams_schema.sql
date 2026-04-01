-- REPAIR SCRIPT FOR TEAMS AND TEAM_REQUESTS (Fixes 400/406 Errors)
-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Ensure Teams table and its columns
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to teams if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='teams' AND COLUMN_NAME='total_deposit') THEN
        ALTER TABLE public.teams ADD COLUMN total_deposit DECIMAL(10, 2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='teams' AND COLUMN_NAME='live_profit') THEN
        ALTER TABLE public.teams ADD COLUMN live_profit DECIMAL(10, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='teams' AND COLUMN_NAME='score') THEN
        ALTER TABLE public.teams ADD COLUMN score INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='teams' AND COLUMN_NAME='owner_id') THEN
        ALTER TABLE public.teams ADD COLUMN owner_id UUID REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='teams' AND COLUMN_NAME='status') THEN
        ALTER TABLE public.teams ADD COLUMN status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'deleted'));
    END IF;
END $$;

-- 2. Ensure Team Requests table and its columns
CREATE TABLE IF NOT EXISTS public.team_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='team_requests' AND COLUMN_NAME='team_name') THEN
        ALTER TABLE public.team_requests ADD COLUMN team_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='team_requests' AND COLUMN_NAME='request_type') THEN
        ALTER TABLE public.team_requests ADD COLUMN request_type TEXT CHECK (request_type IN ('create', 'delete'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='team_requests' AND COLUMN_NAME='status') THEN
        ALTER TABLE public.team_requests ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='team_requests' AND COLUMN_NAME='team_id') THEN
        ALTER TABLE public.team_requests ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='team_requests' AND COLUMN_NAME='updated_at') THEN
        ALTER TABLE public.team_requests ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Ensure Team Messages table
CREATE TABLE IF NOT EXISTS public.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Ensure Team Member Requests table
CREATE TABLE IF NOT EXISTS public.team_member_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ensure profile has team_id
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='profiles' AND COLUMN_NAME='team_id') THEN
        ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. RLS Policies (Fixing permissions)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_requests ENABLE ROW LEVEL SECURITY;

-- Teams: Everyone can view approved teams
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);

-- Team Requests: Users can view their own requests, Admins can view all
DROP POLICY IF EXISTS "Users can view own team requests" ON public.team_requests;
CREATE POLICY "Users can view own team requests" ON public.team_requests FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'ADMIN', 'SUPERADMIN'))
);

DROP POLICY IF EXISTS "Users can insert team requests" ON public.team_requests;
CREATE POLICY "Users can insert team requests" ON public.team_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update team requests" ON public.team_requests;
CREATE POLICY "Admins can update team requests" ON public.team_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'ADMIN', 'SUPERADMIN'))
);

-- Team Messages: Members can view and send
DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;
CREATE POLICY "Team members can view messages" ON public.team_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = team_messages.team_id));

DROP POLICY IF EXISTS "Team members can send messages" ON public.team_messages;
CREATE POLICY "Team members can send messages" ON public.team_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = team_id));

-- Realtime Setup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
EXCEPTION WHEN OTHERS THEN
END $$;

ALTER TABLE public.teams REPLICA IDENTITY FULL;
ALTER TABLE public.team_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
EXCEPTION WHEN OTHERS THEN
END $$;
