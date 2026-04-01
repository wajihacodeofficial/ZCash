-- 1. Add demo_balance to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS demo_balance DECIMAL(10, 2) DEFAULT 0.00;

-- 2. Create demo_plans table
CREATE TABLE IF NOT EXISTS public.demo_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    profit_percentage DECIMAL(5, 2) NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic data
INSERT INTO public.demo_plans (name, duration_days, profit_percentage)
SELECT * FROM (VALUES
    ('Bronze Demo', 3, 5.00),
    ('Silver Demo', 7, 10.00),
    ('Gold Demo', 10, 15.00)
) AS v(name, duration_days, profit_percentage)
WHERE NOT EXISTS (
    SELECT 1 FROM public.demo_plans WHERE demo_plans.name = v.name
);

-- 3. Create demo_investments table
CREATE TABLE IF NOT EXISTS public.demo_investments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id UUID REFERENCES public.demo_plans(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL,
    profit_percentage DECIMAL(5, 2) NOT NULL,
    duration_days INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
    is_credited BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS and setup policies
ALTER TABLE public.demo_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_investments ENABLE ROW LEVEL SECURITY;

-- Demo Plans: Anyone can view active demo plans
DROP POLICY IF EXISTS "Anyone can view active demo plans" ON public.demo_plans;
CREATE POLICY "Anyone can view active demo plans" ON public.demo_plans FOR SELECT USING (active = true);

-- Demo Investments: Users can view their own demo investments
DROP POLICY IF EXISTS "Users can view their own demo investments" ON public.demo_investments;
CREATE POLICY "Users can view their own demo investments" ON public.demo_investments FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own demo investments" ON public.demo_investments;
CREATE POLICY "Users can insert their own demo investments" ON public.demo_investments FOR INSERT WITH CHECK (auth.uid() = user_id);
