import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Playlist {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export interface PlaylistWithMeta extends Playlist {
  video_count?: number;
  cover?: string | null;
}

export const usePlaylists = (ownerId?: string) => {
  const { user } = useAuth();
  const targetId = ownerId ?? user?.id;
  const [playlists, setPlaylists] = useState<PlaylistWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetId) { setPlaylists([]); setLoading(false); return; }
    setLoading(true);
    const { data: pls } = await supabase
      .from("playlists")
      .select("*")
      .eq("owner_id", targetId)
      .order("created_at", { ascending: false });

    const ids = (pls ?? []).map(p => p.id);
    let counts: Record<string, number> = {};
    let covers: Record<string, string | null> = {};
    if (ids.length) {
      const { data: pv } = await supabase
        .from("playlist_videos")
        .select("playlist_id, position, videos:video_id(thumbnail_url)")
        .in("playlist_id", ids)
        .order("position", { ascending: true });
      (pv ?? []).forEach((row: any) => {
        counts[row.playlist_id] = (counts[row.playlist_id] ?? 0) + 1;
        if (!covers[row.playlist_id] && row.videos?.thumbnail_url) {
          covers[row.playlist_id] = row.videos.thumbnail_url;
        }
      });
    }
    setPlaylists((pls ?? []).map(p => ({ ...p, video_count: counts[p.id] ?? 0, cover: covers[p.id] ?? null })));
    setLoading(false);
  }, [targetId]);

  useEffect(() => { load(); }, [load]);

  const create = async (title: string, isPublic = true, description = "") => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("playlists")
      .insert({ owner_id: user.id, title, description: description || null, is_public: isPublic })
      .select().single();
    if (error) { toast.error("No se pudo crear la lista"); return null; }
    toast.success("Lista creada");
    load();
    return data as Playlist;
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("playlists").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else { toast.success("Lista eliminada"); load(); }
  };

  return { playlists, loading, create, remove, refresh: load };
};

export const addToPlaylist = async (playlistId: string, videoId: string) => {
  const { count } = await supabase
    .from("playlist_videos")
    .select("*", { count: "exact", head: true })
    .eq("playlist_id", playlistId);
  const { error } = await supabase
    .from("playlist_videos")
    .insert({ playlist_id: playlistId, video_id: videoId, position: count ?? 0 });
  if (error) {
    toast.error("No se pudo añadir");
    return false;
  }
  toast.success("Añadido a la lista");
  return true;
};
