
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.videos   ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.posts    ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Notificación de menciones
CREATE OR REPLACE FUNCTION public.notify_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor text;
  v_link text;
BEGIN
  IF NEW.mentioned_user_id = NEW.source_user_id THEN RETURN NEW; END IF;
  SELECT COALESCE(display_name, username, 'Alguien') INTO v_actor
    FROM public.profiles WHERE id = NEW.source_user_id;
  v_link := CASE
    WHEN NEW.source_type = 'video'   THEN '/watch/' || NEW.source_id
    WHEN NEW.source_type = 'comment' THEN '/watch/' || NEW.source_id
    WHEN NEW.source_type = 'post'    THEN '/c/' || NEW.mentioned_user_id || '?tab=community'
    ELSE '/'
  END;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  VALUES (NEW.mentioned_user_id, NEW.source_user_id, 'mention',
    v_actor || ' te ha mencionado',
    v_link);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mention_notify ON public.mentions;
CREATE TRIGGER trg_mention_notify
AFTER INSERT ON public.mentions
FOR EACH ROW EXECUTE FUNCTION public.notify_mention();
