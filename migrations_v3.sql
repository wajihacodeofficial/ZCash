-- EasyPay Platform Enhancements Migration (v3)

-- 1. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'alert', 'update', 'roi', 'referral', 'withdraw')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);

-- 2. Team Messages (Discussion Room)
CREATE TABLE IF NOT EXISTS public.team_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can view messages" ON public.team_messages;
CREATE POLICY "Team members can view messages" ON public.team_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = team_messages.team_id));

DROP POLICY IF EXISTS "Team members can send messages" ON public.team_messages;
CREATE POLICY "Team members can send messages" ON public.team_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.team_id = team_id));

-- 3. Team Requests (Formation/Deletion)
CREATE TABLE IF NOT EXISTS public.team_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_name TEXT,
    request_type TEXT CHECK (request_type IN ('create', 'delete')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE, -- For delete requests
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own team requests" ON public.team_requests;
CREATE POLICY "Users can view own team requests" ON public.team_requests FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert team requests" ON public.team_requests;
CREATE POLICY "Users can insert team requests" ON public.team_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Update Transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS request_number TEXT;

-- 5. Update Teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'deleted'));

-- 6. Weekly Battles
CREATE TABLE IF NOT EXISTS public.weekly_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    winner_team_id UUID REFERENCES public.teams(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.weekly_battles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view weekly battles" ON public.weekly_battles;
CREATE POLICY "Anyone can view weekly battles" ON public.weekly_battles FOR SELECT USING (true);
