CREATE TABLE public.playlist_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (playlist_id, subscriber_id)
);

ALTER TABLE public.playlist_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view playlist subscriptions count"
  ON public.playlist_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Users subscribe themselves"
  ON public.playlist_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = subscriber_id);

CREATE POLICY "Users unsubscribe themselves"
  ON public.playlist_subscriptions FOR DELETE
  USING (auth.uid() = subscriber_id);

CREATE INDEX idx_playlist_subs_playlist ON public.playlist_subscriptions(playlist_id);
CREATE INDEX idx_playlist_subs_user ON public.playlist_subscriptions(subscriber_id);