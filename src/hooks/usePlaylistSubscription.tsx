import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export const usePlaylistSubscription = (playlistId: string | undefined) => {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!playlistId) return;
    setLoading(true);
    const [{ count: c }, mine] = await Promise.all([
      supabase.from("playlist_subscriptions").select("id", { count: "exact", head: true }).eq("playlist_id", playlistId),
      user
        ? supabase.from("playlist_subscriptions").select("id").eq("playlist_id", playlistId).eq("subscriber_id", user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCount(c ?? 0);
    setSubscribed(!!mine.data);
    setLoading(false);
  }, [playlistId, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async () => {
    if (!user) { toast.error("Inicia sesión para suscribirte"); return; }
    if (!playlistId) return;
    if (subscribed) {
      await supabase.from("playlist_subscriptions").delete().eq("playlist_id", playlistId).eq("subscriber_id", user.id);
    } else {
      const { error } = await supabase.from("playlist_subscriptions").insert({ playlist_id: playlistId, subscriber_id: user.id });
      if (error) { toast.error("No se pudo suscribir"); return; }
    }
    refresh();
  };

  return { subscribed, count, loading, toggle };
};

export const useSubscribedPlaylists = () => {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setPlaylists([]); setLoading(false); return; }
    setLoading(true);
    const { data: subs } = await supabase
      .from("playlist_subscriptions")
      .select("playlist_id")
      .eq("subscriber_id", user.id);
    const ids = (subs ?? []).map(s => s.playlist_id);
    if (!ids.length) { setPlaylists([]); setLoading(false); return; }
    const { data } = await supabase.from("playlists").select("*").in("id", ids).eq("is_public", true);
    setPlaylists(data ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  return { playlists, loading, refresh: load };
};
