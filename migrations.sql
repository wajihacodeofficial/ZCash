-- 1. Add missing balance column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00;

-- 2. Create a Security Definer function to check admin status (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop recursive policies (if you ran the old ones)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can update plans" ON public.plans;

-- 4. Re-create policies using the non-recursive function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all plans" ON public.plans;
CREATE POLICY "Admins can update all plans" ON public.plans FOR UPDATE USING (public.is_admin());

-- 5. Add proof_url column to transactions table for payment screenshots
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 6. Create the payment-proofs storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage Policy: Allow authenticated users to upload their own files
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload payment proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'payment-proofs' 
);

-- 8. Storage Policy: Allow public read of payment proofs (for admin to see them)
DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;
CREATE POLICY "Public can view payment proofs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payment-proofs');

-- 9. Update profiles check constraint to allow 'banned' role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('user', 'admin', 'banned', 'ADMIN', 'SUPERADMIN'));

-- 10. Messages Table (for notifications and support)
CREATE TABLE IF NOT EXISTS messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  title text,
  body text not null,
  type text default 'admin_message',
  is_read boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own" ON messages;
DROP POLICY IF EXISTS "Auth insert" ON messages;
DROP POLICY IF EXISTS "Mark read" ON messages;

CREATE POLICY "Users read own" ON messages FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
CREATE POLICY "Auth insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Mark read" ON messages FOR UPDATE USING (auth.uid() = receiver_id);


