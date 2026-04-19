import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { VideoWithChannel } from "./useVideos";

export const useWatchLater = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setVideos([]); setIds(new Set()); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("watch_later")
      .select("video_id, added_at, video:videos(*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name))")
      .order("added_at", { ascending: false });
    const list = (data ?? []).map((r: any) => r.video).filter(Boolean) as VideoWithChannel[];
    setVideos(list);
    setIds(new Set(list.map((v) => v.id)));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const add = async (videoId: string) => {
    if (!user) return;
    await supabase.from("watch_later").insert({ user_id: user.id, video_id: videoId });
    setIds((prev) => new Set(prev).add(videoId));
    load();
  };

  const remove = async (videoId: string) => {
    if (!user) return;
    await supabase.from("watch_later").delete().eq("user_id", user.id).eq("video_id", videoId);
    setIds((prev) => { const n = new Set(prev); n.delete(videoId); return n; });
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  const isInList = (videoId: string) => ids.has(videoId);

  return { videos, loading, add, remove, isInList, refresh: load };
};
