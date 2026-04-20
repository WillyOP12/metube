import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ListVideo, Play, Trash2, Globe, Lock } from "lucide-react";
import { formatViews } from "@/lib/format";
import { toast } from "sonner";

interface PlaylistData {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  owner_id: string;
}

interface ItemRow {
  id: string;
  position: number;
  videos: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    views: number;
    channel_id: string;
  } | null;
}

const PlaylistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [pl, setPl] = useState<PlaylistData | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: p } = await supabase.from("playlists").select("*").eq("id", id).maybeSingle();
    setPl(p as PlaylistData | null);
    if (p?.title) document.title = `${p.title} — MeTube`;

    const { data: it } = await supabase
      .from("playlist_videos")
      .select("id, position, videos:video_id(id, title, thumbnail_url, views, channel_id)")
      .eq("playlist_id", id)
      .order("position", { ascending: true });
    setItems((it as unknown as ItemRow[]) ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const removeItem = async (itemId: string) => {
    const { error } = await supabase.from("playlist_videos").delete().eq("id", itemId);
    if (error) toast.error("No se pudo quitar");
    else { toast.success("Quitado de la lista"); load(); }
  };

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div></AppLayout>;
  }
  if (!pl) {
    return <AppLayout><div className="text-center py-20 text-muted-foreground">Lista no encontrada o privada.</div></AppLayout>;
  }

  const isOwner = user?.id === pl.owner_id;
  const firstId = items[0]?.videos?.id;

  return (
    <AppLayout>
      <div className="grid lg:grid-cols-[360px_1fr] gap-8 max-w-6xl mx-auto animate-slide-up">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="glass-card overflow-hidden">
            <div className="aspect-video bg-surface-2 relative">
              {items[0]?.videos?.thumbnail_url ? (
                <img src={items[0].videos.thumbnail_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center"><ListVideo className="h-12 w-12 text-muted-foreground" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            </div>
            <div className="p-5 space-y-3">
              <h1 className="font-display text-xl font-bold">{pl.title}</h1>
              {pl.description && <p className="text-sm text-muted-foreground">{pl.description}</p>}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {pl.is_public ? <><Globe className="h-3 w-3" />Pública</> : <><Lock className="h-3 w-3" />Privada</>} · {items.length} vídeos
              </p>
              {firstId && (
                <Button asChild className="w-full gap-2"><Link to={`/watch/${firstId}`}><Play className="h-4 w-4" />Reproducir todo</Link></Button>
              )}
            </div>
          </Card>
        </aside>

        <div>
          <h2 className="font-display text-lg font-semibold mb-4">Vídeos</h2>
          {items.length === 0 ? (
            <Card className="glass-card p-10 text-center text-muted-foreground">Esta lista está vacía.</Card>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => it.videos && (
                <Link
                  key={it.id}
                  to={`/watch/${it.videos.id}`}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-1 transition group"
                >
                  <span className="w-6 text-sm text-muted-foreground text-center">{idx + 1}</span>
                  <div className="w-40 aspect-video rounded-lg overflow-hidden bg-surface-2 shrink-0">
                    {it.videos.thumbnail_url ? (
                      <img src={it.videos.thumbnail_url} alt={it.videos.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Play className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-2 group-hover:text-foreground">{it.videos.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatViews(it.videos.views)} vistas</p>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition"
                      onClick={(e) => { e.preventDefault(); removeItem(it.id); }}
                    ><Trash2 className="h-4 w-4" /></Button>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default PlaylistDetail;
