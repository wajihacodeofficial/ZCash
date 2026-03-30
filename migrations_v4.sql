-- EasyPay Platform Enhancements Migration (v4)

-- 1) Team member counts
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS members_count INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recalculate_team_members_count(p_team_id UUID)
RETURNS VOID AS $$
BEGIN
  IF p_team_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.teams
  SET members_count = (
    SELECT COUNT(*)
    FROM public.profiles
    WHERE team_id = p_team_id
  )
  WHERE id = p_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sync_team_members_count_from_profiles()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalculate_team_members_count(NEW.team_id);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      PERFORM public.recalculate_team_members_count(OLD.team_id);
      PERFORM public.recalculate_team_members_count(NEW.team_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_team_members_count(OLD.team_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profiles_sync_team_members_count ON public.profiles;
CREATE TRIGGER trg_profiles_sync_team_members_count
AFTER INSERT OR UPDATE OF team_id OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE PROCEDURE public.sync_team_members_count_from_profiles();

UPDATE public.teams t
SET members_count = (
  SELECT COUNT(*)
  FROM public.profiles p
  WHERE p.team_id = t.id
);

-- 2) Team head requested member additions (admin approval)
CREATE TABLE IF NOT EXISTS public.team_member_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_member_requests_unique_pending
ON public.team_member_requests (team_id, target_user_id)
WHERE status = 'pending';

ALTER TABLE public.team_member_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team owners can insert member requests" ON public.team_member_requests;
CREATE POLICY "Team owners can insert member requests"
ON public.team_member_requests
FOR INSERT
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = team_id
      AND t.owner_id = auth.uid()
      AND t.status = 'approved'
  )
);

DROP POLICY IF EXISTS "Team owners can view member requests" ON public.team_member_requests;
CREATE POLICY "Team owners can view member requests"
ON public.team_member_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = team_member_requests.team_id
      AND t.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can manage team member requests" ON public.team_member_requests;
CREATE POLICY "Admins can manage team member requests"
ON public.team_member_requests
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'ADMIN', 'SUPERADMIN')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'ADMIN', 'SUPERADMIN')
  )
);

-- 3) Team owner can rename their team
DROP POLICY IF EXISTS "Team owner can update own team" ON public.teams;
CREATE POLICY "Team owner can update own team"
ON public.teams
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());
