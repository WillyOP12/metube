import { supabase } from "@/integrations/supabase/client";

export const uploadToBucket = async (
  bucket: "avatars" | "banners" | "thumbnails" | "post-images" | "videos",
  userId: string,
  file: File,
  prefix: string,
): Promise<string> => {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${userId}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
