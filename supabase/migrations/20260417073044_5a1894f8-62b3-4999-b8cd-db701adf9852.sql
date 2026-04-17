
-- Restringir listing: SELECT en storage.objects requería bucket_id = 'X' (permitía LIST).
-- Lo restringimos a path-based access. Las URLs públicas (/object/public/) siguen funcionando
-- porque pasan por el endpoint público que no usa estas policies.
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Public read post images" ON storage.objects;

-- Reemplazo: SELECT solo si el path empieza por el uid del usuario autenticado (para listar lo propio)
-- Las URLs públicas para visualizar archivos siguen funcionando vía endpoint público de Supabase Storage.
CREATE POLICY "Users list own avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users list own banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users list own videos" ON storage.objects FOR SELECT USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users list own thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'thumbnails' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users list own post images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images' AND auth.uid()::text = (storage.foldername(name))[1]);
