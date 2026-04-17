import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VideoRow {
  id: string;
  channel_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string;
  source: "upload" | "external";
  duration: number | null;
  views: number;
  is_short: boolean;
  created_at: string;
}

export interface VideoWithChannel extends VideoRow {
  channel: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    channel_name: string | null;
  } | null;
}

interface Options {
  channelId?: string;
  isShort?: boolean;
  search?: string;
  limit?: number;
}

export const useVideos = (opts: Options = {}) => {
  const { channelId, isShort, search, limit = 50 } = opts;
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("videos")
      .select("*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (channelId) q = q.eq("channel_id", channelId);
    if (typeof isShort === "boolean") q = q.eq("is_short", isShort);
    if (search && search.trim()) q = q.ilike("title", `%${search.trim()}%`);
    const { data, error } = await q;
    if (!error) setVideos((data as unknown as VideoWithChannel[]) ?? []);
    setLoading(false);
  }, [channelId, isShort, search, limit]);

  useEffect(() => { load(); }, [load]);

  return { videos, loading, refresh: load };
};

export const useVideo = (id: string | undefined) => {
  const [video, setVideo] = useState<VideoWithChannel | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase
      .from("videos")
      .select("*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name, subscriber_count)")
      .eq("id", id)
      .maybeSingle();
    setVideo(data as unknown as VideoWithChannel | null);
    setLoading(false);
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { video, loading, refresh };
};
