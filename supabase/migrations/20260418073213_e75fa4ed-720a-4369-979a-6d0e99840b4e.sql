-- Add personalization fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS accent_color TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT;

-- Promote guiorpa@proton.me to admin
INSERT INTO public.user_roles (user_id, role)
SELECT 'ad43381f-1658-44f5-afeb-af5e6e178187'::uuid, 'admin'::app_role
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = 'ad43381f-1658-44f5-afeb-af5e6e178187'::uuid AND role = 'admin'::app_role
);