-- 1. Restrict likes / post_likes / subscriptions visibility (no longer publicly listable)
DROP POLICY IF EXISTS "Likes viewable by everyone" ON public.likes;
CREATE POLICY "Likes viewable by authenticated users"
ON public.likes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Post likes viewable by everyone" ON public.post_likes;
CREATE POLICY "Post likes viewable by authenticated users"
ON public.post_likes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Subscriptions viewable by everyone" ON public.subscriptions;
CREATE POLICY "Users see own or owned-channel subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (auth.uid() = subscriber_id OR auth.uid() = channel_id);

-- 2. Privilege escalation hardening on user_roles:
-- Add a restrictive policy ensuring only admins can INSERT/UPDATE/DELETE roles
-- (combined with the existing permissive policy via AND).
CREATE POLICY "Only admins can write roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. View count integrity:
-- Replace UPDATE policy on videos with a WITH CHECK that prevents owners from changing views directly.
DROP POLICY IF EXISTS "Channel owners update videos" ON public.videos;
CREATE POLICY "Channel owners update videos"
ON public.videos FOR UPDATE
TO authenticated
USING (auth.uid() = channel_id)
WITH CHECK (
  auth.uid() = channel_id
  AND views = (SELECT v.views FROM public.videos v WHERE v.id = videos.id)
);

-- Server-side atomic view increment, callable by anyone
CREATE OR REPLACE FUNCTION public.increment_video_view(_video_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.videos SET views = views + 1 WHERE id = _video_id;
$$;

REVOKE ALL ON FUNCTION public.increment_video_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_video_view(uuid) TO anon, authenticated;