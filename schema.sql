-- Supabase Schema Setup for EasyPay Trading Web App

-- Enable PostGIS extension for geometry data if needed (optional)
-- create extension if not exists postgis schema extensions;

-- 1. Users Profile Table (Extends Supabase Auth users)
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

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    country TEXT,
    phone_number TEXT,
    referral_code TEXT UNIQUE,
    referred_by TEXT, -- Stores the referral code of the user who referred them
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'ADMIN', 'SUPERADMIN', 'banned')),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    daily_roi_percent DECIMAL(5, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Default Plans
INSERT INTO public.plans (name, price_usd, daily_roi_percent, duration_days)
SELECT * FROM (VALUES
    ('Starter', 3.00, 1.50, 30),
    ('Growth', 10.00, 2.00, 30),
    ('Premium', 25.00, 2.50, 30)
) AS v(name, price_usd, daily_roi_percent, duration_days)
WHERE NOT EXISTS (
    SELECT 1 FROM public.plans WHERE plans.name = v.name
);

-- 3. User Active Plans
CREATE TABLE IF NOT EXISTS public.user_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    amount_invested DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN DEFAULT true,
    total_earned DECIMAL(10, 2) DEFAULT 0.00
);

-- 4. Transactions Table (Deposits / Withdrawals / Investments)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'promo_bonus', 'referral_bonus', 'roi_earning', 'investment')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    notes TEXT,
    screenshot_url TEXT,
    request_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    bonus_amount DECIMAL(10, 2) NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) Setup

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own profiles, admins can read all
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teams: Everyone can read teams
DROP POLICY IF EXISTS "Anyone can view teams" ON public.teams;
CREATE POLICY "Anyone can view teams" ON public.teams FOR SELECT USING (true);

-- Plans: Everyone can read active plans
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING (active = true);

-- User Plans: Users can view their own plans
DROP POLICY IF EXISTS "Users can view their own plans" ON public.user_plans;
CREATE POLICY "Users can view their own plans" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);

-- Transactions: Users can view their own transactions, insert new ones (deposit/withdraw request)
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Promo Codes: Users can read active promo codes (to validate)
DROP POLICY IF EXISTS "Users can view active promo codes" ON public.promo_codes;
CREATE POLICY "Users can view active promo codes" ON public.promo_codes FOR SELECT USING (active = true);

-- Function: Auto-create profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, country, phone_number, referral_code)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'country',
    new.raw_user_meta_data->>'phone_number',
    new.raw_user_meta_data->>'referral_code' -- Their own generated referral code
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Messages Table (for notifications and support)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'admin_message',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own" ON public.messages;
DROP POLICY IF EXISTS "Auth insert" ON public.messages;
DROP POLICY IF EXISTS "Mark read" ON public.messages;

CREATE POLICY "Users read own" ON public.messages FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "Auth insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Mark read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);


-- 7. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'alert', 'update', 'roi', 'referral', 'withdraw')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;
CREATE POLICY "Anyone can view announcements" ON public.announcements FOR SELECT USING (true);

-- 8. Team Messages (Discussion Room)
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

-- 9. Team Requests (Formation/Deletion)
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

-- 10. Weekly Battles
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


