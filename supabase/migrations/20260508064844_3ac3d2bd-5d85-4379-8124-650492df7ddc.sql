CREATE OR REPLACE FUNCTION public.admin_notify_user(_user_id uuid, _message text, _link text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.notifications(user_id, actor_id, type, message, link)
  VALUES (_user_id, auth.uid(), 'mention', _message, _link);
END;
$$;