-- Migration V2: Update transactions for investment support

-- 1. Add plan_id column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

-- 2. Update status check constraint (if needed, but usually it's fine)
-- 3. Update type check constraint to include 'investment'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('deposit', 'withdrawal', 'promo_bonus', 'referral_bonus', 'roi_earning', 'investment'));

-- 4. Ensure RLS policies still apply (they use public.is_admin() or auth.uid() = user_id, which is fine)

-- 5. Function to increment profile balance (Security Definer for cron job)
CREATE OR REPLACE FUNCTION public.increment_profile_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET balance = balance + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
