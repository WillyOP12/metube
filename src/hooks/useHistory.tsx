import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { VideoWithChannel } from "./useVideos";

export const useHistory = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setVideos([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("watch_history")
      .select("watched_at, video:videos(*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name))")
      .order("watched_at", { ascending: false })
      .limit(100);
    const list = (data ?? []).map((r: any) => r.video).filter(Boolean) as VideoWithChannel[];
    setVideos(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const log = async (videoId: string) => {
    if (!user) return;
    await supabase.from("watch_history").insert({ user_id: user.id, video_id: videoId });
  };

  const clearAll = async () => {
    if (!user) return;
    await supabase.from("watch_history").delete().eq("user_id", user.id);
    setVideos([]);
  };

  return { videos, loading, log, clearAll, refresh: load };
};

export const useLikedVideos = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setVideos([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("likes")
      .select("created_at, video:videos(*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name))")
      .eq("user_id", user.id)
      .eq("type", "like")
      .order("created_at", { ascending: false });
    const list = (data ?? []).map((r: any) => r.video).filter(Boolean) as VideoWithChannel[];
    setVideos(list);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { videos, loading, refresh: load };
};
