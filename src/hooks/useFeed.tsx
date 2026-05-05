import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { VideoWithChannel } from "./useVideos";

/**
 * Algoritmo de feed avanzado (multi-señal):
 *  Señales positivas:
 *    - Recencia (decaimiento exponencial con vida media ~36h)
 *    - Popularidad (log views) y engagement (likes/comentarios por hora)
 *    - Suscripciones del usuario (boost grande)
 *    - Afinidad por hashtags ya vistos / con like
 *    - Afinidad por canal (re-visitas, likes previos)
 *    - Velocidad/Trending (views por hora desde publicación)
 *    - Calidad: penaliza vídeos sin miniatura o sin descripción
 *  Señales negativas:
 *    - Repetición (vídeos ya vistos recientemente)
 *    - Saturación de canal (más de 1 vídeo del mismo canal en top)
 *  Diversidad:
 *    - Re-ranking MMR-lite: penaliza canales/hashtags ya elegidos
 *    - Inserción ocasional de "descubrimiento" (jitter aleatorio)
 *  Cold start:
 *    - Si el usuario no tiene historial: prioriza recencia + trending
 */
export const useFeed = (limit = 24) => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Pool grande para tener material que reordenar
      const { data: pool } = await supabase
        .from("videos")
        .select("*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name)")
        .eq("is_short", false)
        .order("created_at", { ascending: false })
        .limit(200);

      const list = (pool ?? []) as unknown as VideoWithChannel[];
      if (!list.length) { if (!cancelled) { setVideos([]); setLoading(false); } return; }

      const ids = list.map((v) => v.id);

      // Engagement por vídeo
      const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
        supabase.from("likes").select("video_id, type").in("video_id", ids),
        supabase.from("comments").select("video_id").in("video_id", ids),
      ]);
      const likeCounts: Record<string, number> = {};
      const dislikeCounts: Record<string, number> = {};
      (likeRows ?? []).forEach((r: any) => {
        if (r.type === "like") likeCounts[r.video_id] = (likeCounts[r.video_id] ?? 0) + 1;
        else dislikeCounts[r.video_id] = (dislikeCounts[r.video_id] ?? 0) + 1;
      });
      const commentCounts: Record<string, number> = {};
      (commentRows ?? []).forEach((r: any) => {
        commentCounts[r.video_id] = (commentCounts[r.video_id] ?? 0) + 1;
      });

      // Señales personales
      let subSet = new Set<string>();
      const tagAffinity: Record<string, number> = {};
      const channelAffinity: Record<string, number> = {};
      const recentlyWatched = new Set<string>();

      if (user) {
        const [{ data: subs }, { data: hist }, { data: myLikes }] = await Promise.all([
          supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user.id),
          supabase.from("watch_history").select("video_id, watched_at").eq("user_id", user.id).order("watched_at", { ascending: false }).limit(80),
          supabase.from("likes").select("video_id").eq("user_id", user.id).eq("type", "like").limit(80),
        ]);
        subSet = new Set((subs ?? []).map((s: any) => s.channel_id));

        const histIds = (hist ?? []).map((h: any) => h.video_id);
        histIds.forEach((id: string) => recentlyWatched.add(id));
        const likedIds = (myLikes ?? []).map((l: any) => l.video_id);
        const interestIds = Array.from(new Set([...histIds, ...likedIds]));

        if (interestIds.length) {
          const { data: vh } = await supabase
            .from("videos")
            .select("id, channel_id, hashtags")
            .in("id", interestIds);
          (vh ?? []).forEach((v: any) => {
            const liked = likedIds.includes(v.id);
            const weight = liked ? 3 : 1;
            channelAffinity[v.channel_id] = (channelAffinity[v.channel_id] ?? 0) + weight;
            (v.hashtags || []).forEach((t: string) => {
              tagAffinity[t] = (tagAffinity[t] ?? 0) + weight;
            });
          });
        }
      }

      const isColdStart = !user || (Object.keys(tagAffinity).length === 0 && subSet.size === 0);
      const now = Date.now();

      const scoreOf = (v: any) => {
        const ageH = Math.max(0.5, (now - new Date(v.created_at).getTime()) / 3_600_000);
        // Decaimiento exponencial (vida media 36h)
        const recency = 100 * Math.pow(0.5, ageH / 36);
        const views = v.views ?? 0;
        const likes = likeCounts[v.id] ?? 0;
        const dislikes = dislikeCounts[v.id] ?? 0;
        const comments = commentCounts[v.id] ?? 0;
        // Wilson-ish quality
        const ratio = likes + dislikes > 0 ? likes / (likes + dislikes) : 0.5;
        const popularity = Math.log10(views + 1) * 18 + Math.log10(likes + 1) * 14 + Math.log10(comments + 1) * 10;
        const trending = (views / Math.max(1, ageH)) * 0.5;          // velocidad
        const subBoost = subSet.has(v.channel_id) ? 60 : 0;
        const channelAff = (channelAffinity[v.channel_id] ?? 0) * 6;
        const tagAff = (v.hashtags || []).reduce((a: number, t: string) => a + (tagAffinity[t] ?? 0) * 4, 0);
        const quality = ratio * 20 + (v.thumbnail_url ? 6 : -8) + (v.description ? 3 : 0);
        const seenPenalty = recentlyWatched.has(v.id) ? -120 : 0;
        const cold = isColdStart ? recency * 0.6 + trending * 0.3 : 0;
        const discovery = Math.random() * 8;
        return recency + popularity + trending + subBoost + channelAff + tagAff + quality + seenPenalty + cold + discovery;
      };

      const scored = list.map((v) => ({ v, s: scoreOf(v) })).sort((a, b) => b.s - a.s);

      // MMR-lite: penaliza diversidad por canal/hashtag ya seleccionados
      const out: VideoWithChannel[] = [];
      const channelCount: Record<string, number> = {};
      const tagCount: Record<string, number> = {};
      const used = new Set<string>();

      while (out.length < limit && scored.length) {
        let bestIdx = 0;
        let bestVal = -Infinity;
        for (let i = 0; i < Math.min(scored.length, 40); i++) {
          const { v, s } = scored[i];
          if (used.has(v.id)) continue;
          const cPenalty = (channelCount[v.channel_id] ?? 0) * 35;
          const tPenalty = (v.hashtags || []).reduce((a: number, t: string) => a + (tagCount[t] ?? 0) * 4, 0);
          const adj = s - cPenalty - tPenalty;
          if (adj > bestVal) { bestVal = adj; bestIdx = i; }
        }
        const pick = scored.splice(bestIdx, 1)[0];
        if (!pick || used.has(pick.v.id)) continue;
        used.add(pick.v.id);
        out.push(pick.v);
        channelCount[pick.v.channel_id] = (channelCount[pick.v.channel_id] ?? 0) + 1;
        (pick.v.hashtags || []).forEach((t: string) => { tagCount[t] = (tagCount[t] ?? 0) + 1; });
      }

      if (!cancelled) { setVideos(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user?.id, limit]);

  return { videos, loading };
};
