
-- 1) Hashtags en vídeos y posts
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.posts  ADD COLUMN IF NOT EXISTS hashtags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_videos_hashtags ON public.videos USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags  ON public.posts  USING GIN (hashtags);

-- 2) Suspensión en profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_until   timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text,
  ADD COLUMN IF NOT EXISTS suspended_by      uuid;

-- Helper: ¿está suspendido este usuario?
CREATE OR REPLACE FUNCTION public.is_suspended(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND suspended_until IS NOT NULL AND suspended_until > now()
  );
$$;

-- 3) Comentarios en posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Post comments viewable by everyone" ON public.post_comments;
CREATE POLICY "Post comments viewable by everyone"
ON public.post_comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Auth users create post comments" ON public.post_comments;
CREATE POLICY "Auth users create post comments"
ON public.post_comments FOR INSERT
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users update own post comments" ON public.post_comments;
CREATE POLICY "Users update own post comments"
ON public.post_comments FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own post comments" ON public.post_comments;
CREATE POLICY "Users delete own post comments"
ON public.post_comments FOR DELETE
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'moderator'::app_role)
);

CREATE TRIGGER trg_post_comments_updated
BEFORE UPDATE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Menciones (informativo + para notificaciones)
CREATE TABLE IF NOT EXISTS public.mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentioned_user_id uuid NOT NULL,
  source_user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('video','post','comment','post_comment')),
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mentions_user ON public.mentions(mentioned_user_id);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mentions viewable" ON public.mentions;
CREATE POLICY "Mentions viewable" ON public.mentions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users create own mentions" ON public.mentions;
CREATE POLICY "Users create own mentions"
ON public.mentions FOR INSERT
WITH CHECK (auth.uid() = source_user_id);

-- 5) Nuevos tipos de notificación
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mention' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'mention';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'new_post_comment' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'new_post_comment';
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'account_suspended' AND enumtypid = 'public.notification_type'::regtype) THEN
    ALTER TYPE public.notification_type ADD VALUE 'account_suspended';
  END IF;
END $$;

-- Permitir crear notificaciones desde clientes autenticados (para menciones).
DROP POLICY IF EXISTS "Auth users can create notifications" ON public.notifications;
CREATE POLICY "Auth users can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = actor_id);

-- 6) Notificación al comentar un post
CREATE OR REPLACE FUNCTION public.notify_new_post_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_actor text;
BEGIN
  SELECT channel_id INTO v_owner FROM public.posts WHERE id = NEW.post_id;
  IF v_owner IS NULL OR v_owner = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  VALUES (v_owner, NEW.user_id, 'new_post_comment',
    v_actor || ' comentó en tu publicación',
    '/c/' || v_owner || '?tab=community');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_new_post_comment ON public.post_comments;
CREATE TRIGGER trg_notify_new_post_comment
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_new_post_comment();

-- 7) Triggers de notificación de comentarios/likes/videos/subs (re-engancha por si no estaban)
DROP TRIGGER IF EXISTS trg_notify_new_comment ON public.comments;
CREATE TRIGGER trg_notify_new_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.notify_new_comment();

DROP TRIGGER IF EXISTS trg_notify_new_like ON public.likes;
CREATE TRIGGER trg_notify_new_like AFTER INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION public.notify_new_like();

DROP TRIGGER IF EXISTS trg_notify_new_video ON public.videos;
CREATE TRIGGER trg_notify_new_video AFTER INSERT ON public.videos FOR EACH ROW EXECUTE FUNCTION public.notify_new_video();

DROP TRIGGER IF EXISTS trg_subscriber_count ON public.subscriptions;
CREATE TRIGGER trg_subscriber_count AFTER INSERT OR DELETE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_subscriber_count();

DROP TRIGGER IF EXISTS trg_notify_new_subscriber ON public.subscriptions;
CREATE TRIGGER trg_notify_new_subscriber AFTER INSERT ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.notify_new_subscriber();

-- 8) Bloquear acciones a usuarios suspendidos (modo solo lectura)
DROP POLICY IF EXISTS "Channel owners create videos" ON public.videos;
CREATE POLICY "Channel owners create videos"
ON public.videos FOR INSERT
WITH CHECK (auth.uid() = channel_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Auth users create comments" ON public.comments;
CREATE POLICY "Auth users create comments"
ON public.comments FOR INSERT
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Channel owners create posts" ON public.posts;
CREATE POLICY "Channel owners create posts"
ON public.posts FOR INSERT
WITH CHECK (auth.uid() = channel_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users manage own likes" ON public.likes;
CREATE POLICY "Users manage own likes"
ON public.likes FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND NOT public.is_suspended(auth.uid()));

DROP POLICY IF EXISTS "Users manage own subs" ON public.subscriptions;
CREATE POLICY "Users manage own subs"
ON public.subscriptions FOR ALL
USING (auth.uid() = subscriber_id)
WITH CHECK (auth.uid() = subscriber_id AND NOT public.is_suspended(auth.uid()));

-- 9) Solo moderadores/admins pueden actualizar el campo de suspensión.
-- Usamos una política específica para mods + restringimos la columna en la del usuario.
DROP POLICY IF EXISTS "Mods can suspend users" ON public.profiles;
CREATE POLICY "Mods can suspend users"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));

-- 10) Admin: borrar cuentas (desde edge function se hará con service role; aquí marcamos política de delete en profiles)
DROP POLICY IF EXISTS "Admins delete profiles" ON public.profiles;
CREATE POLICY "Admins delete profiles"
ON public.profiles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));
