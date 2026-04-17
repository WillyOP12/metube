import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useLikes = (videoId: string | undefined) => {
  const { user } = useAuth();
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [mine, setMine] = useState<"like" | "dislike" | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!videoId) return;
    setLoading(true);
    const { data } = await supabase.from("likes").select("type, user_id").eq("video_id", videoId);
    const list = data ?? [];
    setLikes(list.filter(l => l.type === "like").length);
    setDislikes(list.filter(l => l.type === "dislike").length);
    setMine((list.find(l => l.user_id === user?.id)?.type ?? null) as "like" | "dislike" | null);
    setLoading(false);
  }, [videoId, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async (type: "like" | "dislike") => {
    if (!user || !videoId) return;
    if (mine === type) {
      await supabase.from("likes").delete().eq("video_id", videoId).eq("user_id", user.id);
    } else if (mine) {
      await supabase.from("likes").update({ type }).eq("video_id", videoId).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ video_id: videoId, user_id: user.id, type });
    }
    refresh();
  };

  return { likes, dislikes, mine, loading, toggle };
};
