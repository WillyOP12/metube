
-- 1) Notifications: drop user insert policy (triggers handle inserts)
DROP POLICY IF EXISTS "Auth users can create notifications" ON public.notifications;

-- 2) Mentions: restrict SELECT to authenticated participants
DROP POLICY IF EXISTS "Mentions viewable" ON public.mentions;
CREATE POLICY "Mentions viewable by participants"
ON public.mentions FOR SELECT
TO authenticated
USING (auth.uid() = mentioned_user_id OR auth.uid() = source_user_id);

-- 3) Move moderation fields off profiles
CREATE TABLE IF NOT EXISTS public.profile_moderation (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  suspended_until timestamptz,
  suspended_by uuid,
  suspension_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrate existing data
INSERT INTO public.profile_moderation (user_id, suspended_until, suspended_by, suspension_reason)
SELECT id, suspended_until, suspended_by, suspension_reason
FROM public.profiles
WHERE suspended_until IS NOT NULL OR suspended_by IS NOT NULL OR suspension_reason IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_until;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspended_by;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS suspension_reason;

ALTER TABLE public.profile_moderation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own moderation"
ON public.profile_moderation FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

CREATE POLICY "Mods manage moderation"
ON public.profile_moderation FOR ALL
TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'moderator'));

-- 4) Remove overly permissive mod-update policy on profiles
DROP POLICY IF EXISTS "Mods can suspend users" ON public.profiles;

-- 5) Update is_suspended to use new table
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profile_moderation
    WHERE user_id = _user_id AND suspended_until IS NOT NULL AND suspended_until > now()
  );
$$;
