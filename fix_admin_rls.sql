-- Update the is_admin helper function to support all administrative roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'ADMIN', 'SUPERADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Profiles: Grant administrative access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (public.is_admin());

-- 2. Transactions: Grant administrative access
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.transactions;
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update all transactions" ON public.transactions;
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE USING (public.is_admin());

-- 3. Messages: Grant administrative access
DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
CREATE POLICY "Admins can view all messages" ON public.messages FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert messages" ON public.messages;
CREATE POLICY "Admins can insert messages" ON public.messages FOR INSERT WITH CHECK (public.is_admin());

-- 4. Plans: Grant administrative access
DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (public.is_admin());

-- 5. User Plans: Grant administrative access
DROP POLICY IF EXISTS "Admins can view all user plans" ON public.user_plans;
CREATE POLICY "Admins can view all user plans" ON public.user_plans FOR SELECT USING (public.is_admin());

-- 6. Promo Codes: Grant administrative access
DROP POLICY IF EXISTS "Admins can manage promo codes" ON public.promo_codes;
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes FOR ALL USING (public.is_admin());

-- 7. Ensure SUPERADMIN has all permissions (redundant if is_admin() is used, but good for safety)
-- (Already covered by using is_admin() in policies above)
