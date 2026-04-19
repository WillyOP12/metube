-- Drop overly permissive public read on storage.objects (if any explicit ones exist for these buckets)
-- and replace with: direct URL access remains (public buckets serve via CDN), but folder listing is owner-only.

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polname IN (
        'Avatars are publicly accessible',
        'Banners are publicly accessible',
        'Videos are publicly accessible',
        'Thumbnails are publicly accessible',
        'Post images are publicly accessible',
        'Public read avatars',
        'Public read banners',
        'Public read videos',
        'Public read thumbnails',
        'Public read post-images'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- Owner-only listing for each public bucket (direct file URLs still work via CDN)
CREATE POLICY "Owner can list avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can list banners"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can list videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can list thumbnails"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can list post-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);