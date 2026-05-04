import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { VideoWithChannel } from "./useVideos";

/**
 * Feed híbrido recomendado:
 * - Recientes (peso por edad)
 * - Populares (peso por views)
 * - Suscripciones del usuario (boost si está logueado)
 * - Afinidad por hashtags ya vistos (historial)
 * - Diversidad: limita a 2 vídeos consecutivos del mismo canal
 */
export const useFeed = (limit = 24) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: pool } = await supabase
        .from("videos")
        .select("*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name)")
        .eq("is_short", false)
        .order("created_at", { ascending: false })
        .limit(120);

      const list = (pool ?? []) as unknown as VideoWithChannel[];

      // Suscripciones
      let subSet = new Set<string>();
      const tagAffinity: Record<string, number> = {};
      if (user) {
        const { data: subs } = await supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user.id);
        subSet = new Set((subs ?? []).map((s: any) => s.channel_id));
        const { data: hist } = await supabase
          .from("watch_history")
          .select("video_id")
          .eq("user_id", user.id)
          .order("watched_at", { ascending: false })
          .limit(40);
        const ids = (hist ?? []).map((h: any) => h.video_id);
        if (ids.length) {
          const { data: vh } = await supabase.from("videos").select("hashtags").in("id", ids);
          (vh ?? []).forEach((v: any) => (v.hashtags || []).forEach((t: string) => {
            tagAffinity[t] = (tagAffinity[t] ?? 0) + 1;
          }));
        }
      }

      const now = Date.now();
      const score = (v: any) => {
        const ageH = Math.max(1, (now - new Date(v.created_at).getTime()) / 3_600_000);
        const recency = 100 / Math.pow(ageH, 0.6);          // recientes
        const pop = Math.log10((v.views ?? 0) + 1) * 20;     // populares
        const sub = subSet.has(v.channel_id) ? 50 : 0;       // suscripciones
        const aff = (v.hashtags || []).reduce((a: number, t: string) => a + (tagAffinity[t] ?? 0) * 5, 0);
        const jitter = Math.random() * 6;                    // descubrimiento
        return recency + pop + sub + aff + jitter;
      };

      const sorted = [...list].sort((a, b) => score(b) - score(a));

      // Diversidad: max 2 consecutivos del mismo canal
      const out: VideoWithChannel[] = [];
      const tail: string[] = [];
      const used = new Set<string>();
      const queue = [...sorted];
      while (out.length < limit && queue.length) {
        const idx = queue.findIndex((v) => !(tail.length >= 2 && tail[0] === tail[1] && tail[0] === v.channel_id));
        const pick = queue.splice(idx === -1 ? 0 : idx, 1)[0];
        if (used.has(pick.id)) continue;
        used.add(pick.id);
        out.push(pick);
        tail.push(pick.channel_id);
        if (tail.length > 2) tail.shift();
      }

      if (!cancelled) { setVideos(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, limit]);

  return { videos, loading };
};
