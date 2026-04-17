DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comments_user_id_fkey' AND conrelid = 'public.comments'::regclass
  ) THEN
    DELETE FROM public.comments WHERE user_id NOT IN (SELECT id FROM public.profiles);
    ALTER TABLE public.comments
      ADD CONSTRAINT comments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON public.videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON public.comments(video_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_video_id ON public.likes(video_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_channel_id ON public.subscriptions(channel_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber_id ON public.subscriptions(subscriber_id);