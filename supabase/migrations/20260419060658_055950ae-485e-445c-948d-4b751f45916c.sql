-- ============================================
-- NOTIFICATIONS
-- ============================================
CREATE TYPE public.notification_type AS ENUM (
  'new_video', 'new_comment', 'new_like', 'new_subscriber', 'new_reply', 'report_resolved'
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  actor_id uuid,
  type public.notification_type NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications"
ON public.notifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
ON public.notifications FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Inserts come from triggers (SECURITY DEFINER), no user insert needed.

-- Realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================
-- WATCH LATER
-- ============================================
CREATE TABLE public.watch_later (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
ALTER TABLE public.watch_later ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watch_later"
ON public.watch_later FOR ALL
TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- WATCH HISTORY
-- ============================================
CREATE TABLE public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  watched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_watch_history_user ON public.watch_history(user_id, watched_at DESC);
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history"
ON public.watch_history FOR ALL
TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================
-- NOTIFICATION TRIGGERS
-- ============================================

-- New comment on a video → notify channel owner
CREATE OR REPLACE FUNCTION public.notify_new_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_channel uuid;
  v_title text;
  v_actor_name text;
BEGIN
  SELECT channel_id, title INTO v_channel, v_title FROM public.videos WHERE id = NEW.video_id;
  IF v_channel IS NULL OR v_channel = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  VALUES (v_channel, NEW.user_id, 'new_comment',
    v_actor_name || ' comentó en "' || v_title || '"',
    '/watch/' || NEW.video_id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.notify_new_comment();

-- New like on a video → notify channel owner (only likes, not dislikes)
CREATE OR REPLACE FUNCTION public.notify_new_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_channel uuid; v_title text; v_actor_name text;
BEGIN
  IF NEW.type <> 'like' THEN RETURN NEW; END IF;
  SELECT channel_id, title INTO v_channel, v_title FROM public.videos WHERE id = NEW.video_id;
  IF v_channel IS NULL OR v_channel = NEW.user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name FROM public.profiles WHERE id = NEW.user_id;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  VALUES (v_channel, NEW.user_id, 'new_like',
    v_actor_name || ' le ha dado like a "' || v_title || '"',
    '/watch/' || NEW.video_id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_like
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_new_like();

-- New subscriber → notify channel owner
CREATE OR REPLACE FUNCTION public.notify_new_subscriber()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor_name text;
BEGIN
  IF NEW.channel_id = NEW.subscriber_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor_name FROM public.profiles WHERE id = NEW.subscriber_id;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  VALUES (NEW.channel_id, NEW.subscriber_id, 'new_subscriber',
    v_actor_name || ' se ha suscrito a tu canal',
    '/c/' || NEW.subscriber_id);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_subscriber
AFTER INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.notify_new_subscriber();

-- New video uploaded → notify all subscribers of that channel
CREATE OR REPLACE FUNCTION public.notify_new_video()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_channel_name text;
BEGIN
  SELECT COALESCE(channel_name, display_name, username, 'Un canal')
    INTO v_channel_name FROM public.profiles WHERE id = NEW.channel_id;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  SELECT s.subscriber_id, NEW.channel_id, 'new_video',
    v_channel_name || ' ha subido: "' || NEW.title || '"',
    '/watch/' || NEW.id
  FROM public.subscriptions s
  WHERE s.channel_id = NEW.channel_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_notify_new_video
AFTER INSERT ON public.videos
FOR EACH ROW EXECUTE FUNCTION public.notify_new_video();

-- ============================================
-- AUTO-MAINTAIN subscriber_count
-- ============================================
CREATE OR REPLACE FUNCTION public.update_subscriber_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET subscriber_count = subscriber_count + 1 WHERE id = NEW.channel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET subscriber_count = GREATEST(subscriber_count - 1, 0) WHERE id = OLD.channel_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER trg_subscriber_count_ins
AFTER INSERT ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_subscriber_count();
CREATE TRIGGER trg_subscriber_count_del
AFTER DELETE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_subscriber_count();

-- ============================================
-- DELETE MY ACCOUNT
-- ============================================
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  DELETE FROM auth.users WHERE id = uid;
END $$;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;