import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { CommunityPosts } from "@/components/CommunityPosts";
import { ChannelHeader } from "@/components/ChannelHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ListVideo, Play, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVideos } from "@/hooks/useVideos";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/hooks/useProfile";

interface PublicPlaylist {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  video_count: number;
}

const Channel = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [postCount, setPostCount] = useState(0);
  const [publicPlaylists, setPublicPlaylists] = useState<PublicPlaylist[]>([]);
  const { videos, loading: videosLoading } = useVideos({ channelId: id });
  const { subscribed, count, toggle, isOwner } = useSubscription(id);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const [{ data }, { count: pc }, { data: pls }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("channel_id", id),
        supabase.from("playlists").select("id, title, description").eq("owner_id", id).eq("is_public", true).order("created_at", { ascending: false }),
      ]);
      setProfile(data as Profile | null);
      setPostCount(pc ?? 0);

      const plIds = (pls ?? []).map(p => p.id);
      const counts: Record<string, number> = {};
      const covers: Record<string, string | null> = {};
      if (plIds.length) {
        const { data: pv } = await supabase
          .from("playlist_videos")
          .select("playlist_id, position, videos:video_id(thumbnail_url)")
          .in("playlist_id", plIds)
          .order("position", { ascending: true });
        (pv ?? []).forEach((row: any) => {
          counts[row.playlist_id] = (counts[row.playlist_id] ?? 0) + 1;
          if (!covers[row.playlist_id] && row.videos?.thumbnail_url) {
            covers[row.playlist_id] = row.videos.thumbnail_url;
          }
        });
      }
      setPublicPlaylists((pls ?? []).map(p => ({
        ...p,
        video_count: counts[p.id] ?? 0,
        cover: covers[p.id] ?? null,
      })));

      setLoading(false);
      if (data?.display_name) document.title = `${data.display_name} — MeTube`;
    };
    load();
  }, [id]);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div></AppLayout>;
  }

  if (!profile) {
    return <AppLayout><div className="text-center py-20 text-muted-foreground">Perfil no encontrado.</div></AppLayout>;
  }

  // Comunidad: solo canales pueden tener posts. Mostrar pestaña si hay posts o si el dueño es un canal.
  const showCommunity = profile.is_channel && (isOwner || postCount > 0);
  const showPlaylists = publicPlaylists.length > 0;

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-slide-up">
        <ChannelHeader
          profile={profile}
          videosCount={videos.length}
          count={count}
          subscribed={subscribed}
          isOwner={isOwner}
          user={user}
          onToggle={toggle}
        />

        <Tabs defaultValue="videos" className="mt-8">
          <TabsList className="bg-surface-1 border border-border">
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            {showPlaylists && <TabsTrigger value="playlists">Listas</TabsTrigger>}
            {showCommunity && <TabsTrigger value="community">Comunidad</TabsTrigger>}
          </TabsList>
          <TabsContent value="videos" className="mt-6">
            <VideoGrid videos={videos} loading={videosLoading} emptyText="Este perfil aún no tiene vídeos." />
          </TabsContent>
          {showPlaylists && (
            <TabsContent value="playlists" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {publicPlaylists.map(p => (
                  <Card key={p.id} className="glass-card overflow-hidden group">
                    <Link to={`/playlist/${p.id}`} className="block">
                      <div className="aspect-video bg-surface-2 relative overflow-hidden">
                        {p.cover ? (
                          <img src={p.cover} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center"><ListVideo className="h-10 w-10 text-muted-foreground" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                        <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/85 text-xs font-medium flex items-center gap-1">
                          <Play className="h-3 w-3" />{p.video_count} vídeos
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-display font-semibold truncate">{p.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Globe className="h-3 w-3" />Pública
                        </p>
                      </div>
                    </Link>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
          {showCommunity && (
            <TabsContent value="community" className="mt-6">
              <CommunityPosts channelId={profile.id} channel={profile} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Channel;
