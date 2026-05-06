
-- Polls in community feed
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL UNIQUE,
  question text NOT NULL,
  multi_choice boolean NOT NULL DEFAULT false,
  closes_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  position integer NOT NULL DEFAULT 0
);
CREATE INDEX idx_poll_options_poll ON public.poll_options(poll_id);

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);
CREATE INDEX idx_poll_votes_poll ON public.poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user ON public.poll_votes(user_id);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls visible to everyone (post is public)
CREATE POLICY "Polls viewable by everyone" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Channel owner creates poll" ON public.polls FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.channel_id = auth.uid()) AND NOT is_suspended(auth.uid()));
CREATE POLICY "Channel owner deletes poll" ON public.polls FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.channel_id = auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Poll options viewable by everyone" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "Owner manages poll options" ON public.poll_options FOR ALL
  USING (EXISTS (SELECT 1 FROM public.polls pl JOIN public.posts p ON p.id = pl.post_id WHERE pl.id = poll_id AND p.channel_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.polls pl JOIN public.posts p ON p.id = pl.post_id WHERE pl.id = poll_id AND p.channel_id = auth.uid()));

-- Votes: anyone authed can read aggregated; users manage own
CREATE POLICY "Poll votes viewable by authenticated" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own vote" ON public.poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND NOT is_suspended(auth.uid()));
CREATE POLICY "Users delete own vote" ON public.poll_votes FOR DELETE
  USING (auth.uid() = user_id);
