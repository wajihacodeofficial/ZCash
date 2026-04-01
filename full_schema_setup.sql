-- ZCASH MASTER SCHEMA SETUP (CONSOLIDATED)
-- RUN THIS IN SUPABASE SQL EDITOR TO REPAIR MISSING TABLES AND 400/406 ERRORS

-- 1. Core Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Teams Table (First, so Profiles can reference it)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    total_deposit DECIMAL(10, 2) DEFAULT 0.00,
    live_profit DECIMAL(10, 2) DEFAULT 0.00,
    score INTEGER DEFAULT 0,
    owner_id UUID, -- Will add reference after profiles table exists
    status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Profiles Table (Core table for all other relations)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    email TEXT UNIQUE NOT NULL,
    username TEXT,
    country TEXT,
    phone_number TEXT,
    referral_code TEXT UNIQUE,
    referred_by TEXT, 
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'ADMIN', 'SUPERADMIN', 'banned')),
    balance DECIMAL(10, 2) DEFAULT 0.00,
    total_roi DECIMAL(10, 2) DEFAULT 0.00,
    total_invested DECIMAL(10, 2) DEFAULT 0.00,
    email_verified BOOLEAN DEFAULT false,
    email_confirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add the owner_id reference to teams 
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'teams_owner_id_fkey'
    ) THEN
        ALTER TABLE public.teams ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    price_usd DECIMAL(10, 2) NOT NULL,
    daily_roi_percent DECIMAL(5, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. User Active Plans
CREATE TABLE IF NOT EXISTS public.user_plans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
    amount_invested DECIMAL(10, 2) NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    active BOOLEAN DEFAULT true,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'promo_bonus', 'referral_bonus', 'roi_earning', 'investment')),
    amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
    notes TEXT,
    screenshot_url TEXT,
    proof_url TEXT,
    request_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Team Requests Table
CREATE TABLE IF NOT EXISTS public.team_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_name TEXT,
    request_type TEXT CHECK (request_type IN ('create', 'delete')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Team Messages Table
CREATE TABLE IF NOT EXISTS public.team_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Team Member Requests Table
CREATE TABLE IF NOT EXISTS public.team_member_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Weekly Battles
CREATE TABLE IF NOT EXISTS public.weekly_battles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    winner_team_id UUID REFERENCES public.teams(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Support Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'admin_message',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES (Row Level Security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles: view own" ON public.profiles;
CREATE POLICY "Profiles: view own" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles: update own" ON public.profiles;
CREATE POLICY "Profiles: update own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Teams: view all" ON public.teams;
CREATE POLICY "Teams: view all" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Transactions: view own" ON public.transactions;
CREATE POLICY "Transactions: view own" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Transactions: insert own" ON public.transactions;
CREATE POLICY "Transactions: insert own" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'username');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- DEFAULT DATA: Plans
INSERT INTO public.plans (name, price_usd, daily_roi_percent, duration_days)
VALUES 
    ('Starter', 3.00, 1.50, 30),
    ('Growth', 10.00, 2.00, 30),
    ('Premium', 25.00, 2.50, 30)
ON CONFLICT (id) DO NOTHING;

-- REALTIME CONFIG
BEGIN;
  ALTER TABLE public.teams REPLICA IDENTITY FULL;
  ALTER TABLE public.team_messages REPLICA IDENTITY FULL;
  ALTER TABLE public.transactions REPLICA IDENTITY FULL;
  ALTER TABLE public.profiles REPLICA IDENTITY FULL;
  
  DO $$
  BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.teams;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END $$;
COMMIT;
