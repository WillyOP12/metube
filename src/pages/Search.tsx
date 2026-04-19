import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Search as SearchIcon, ListVideo, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVideos } from "@/hooks/useVideos";

interface ChannelResult {
  id: string;
  display_name: string | null;
  channel_name: string | null;
  username: string | null;
  avatar_url: string | null;
  subscriber_count: number;
}
interface PlaylistResult {
  id: string;
  title: string;
  description: string | null;
  owner_id: string;
}

const Search = () => {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const term = params.get("q") ?? "";
  const [tab, setTab] = useState<"all" | "videos" | "shorts" | "channels" | "playlists">("all");

  const { videos: allVideos, loading: loadingV } = useVideos({ search: term, limit: 30 });
  const videosOnly = allVideos.filter((v) => !v.is_short);
  const shortsOnly = allVideos.filter((v) => v.is_short);

  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);

  useEffect(() => {
    document.title = term ? `Búsqueda: ${term} — MeTube` : "Búsqueda — MeTube";
    if (!term) { setChannels([]); setPlaylists([]); return; }
    (async () => {
      const [{ data: ch }, { data: pl }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, display_name, channel_name, username, avatar_url, subscriber_count")
          .eq("is_channel", true)
          .or(`display_name.ilike.%${term}%,channel_name.ilike.%${term}%,username.ilike.%${term}%`)
          .limit(20),
        supabase
          .from("playlists")
          .select("id, title, description, owner_id")
          .eq("is_public", true)
          .ilike("title", `%${term}%`)
          .limit(20),
      ]);
      setChannels((ch ?? []) as ChannelResult[]);
      setPlaylists((pl ?? []) as PlaylistResult[]);
    })();
  }, [term]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(q.trim() ? { q: q.trim() } : {});
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
        <form onSubmit={submit} className="relative max-w-2xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar vídeos, canales, listas..."
            className="pl-10 h-11 bg-surface-1"
            autoFocus
          />
        </form>

        {!term ? (
          <div className="text-center py-20 text-muted-foreground">
            <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Escribe algo para empezar a buscar.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Resultados para <span className="text-foreground font-medium">"{term}"</span>
            </p>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList className="bg-surface-2">
                <TabsTrigger value="all">Todo</TabsTrigger>
                <TabsTrigger value="videos">Vídeos ({videosOnly.length})</TabsTrigger>
                <TabsTrigger value="shorts">Shorts ({shortsOnly.length})</TabsTrigger>
                <TabsTrigger value="channels">Canales ({channels.length})</TabsTrigger>
                <TabsTrigger value="playlists">Listas ({playlists.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6 space-y-8">
                {channels.length > 0 && (
                  <section>
                    <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><Users className="h-4 w-4" /> Canales</h2>
                    <ChannelList channels={channels.slice(0, 4)} />
                  </section>
                )}
                <section>
                  <h2 className="font-display text-lg font-semibold mb-3">Vídeos</h2>
                  <VideoGrid videos={videosOnly.slice(0, 8)} loading={loadingV} emptyText="Sin vídeos." />
                </section>
                {playlists.length > 0 && (
                  <section>
                    <h2 className="font-display text-lg font-semibold mb-3 flex items-center gap-2"><ListVideo className="h-4 w-4" /> Listas</h2>
                    <PlaylistList playlists={playlists.slice(0, 4)} />
                  </section>
                )}
              </TabsContent>

              <TabsContent value="videos" className="mt-6">
                <VideoGrid videos={videosOnly} loading={loadingV} emptyText="Sin vídeos." />
              </TabsContent>
              <TabsContent value="shorts" className="mt-6">
                <VideoGrid videos={shortsOnly} loading={loadingV} emptyText="Sin shorts." />
              </TabsContent>
              <TabsContent value="channels" className="mt-6">
                <ChannelList channels={channels} />
              </TabsContent>
              <TabsContent value="playlists" className="mt-6">
                <PlaylistList playlists={playlists} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
};

const ChannelList = ({ channels }: { channels: ChannelResult[] }) => {
  if (!channels.length) return <p className="text-sm text-muted-foreground">Sin canales.</p>;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {channels.map((c) => {
        const name = c.channel_name || c.display_name || c.username || "Canal";
        const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
        return (
          <Link key={c.id} to={`/c/${c.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-surface-1 hover:bg-surface-2 transition">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={c.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface-2">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-display font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground">@{c.username} · {c.subscriber_count} subs</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

const PlaylistList = ({ playlists }: { playlists: PlaylistResult[] }) => {
  if (!playlists.length) return <p className="text-sm text-muted-foreground">Sin listas.</p>;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {playlists.map((p) => (
        <Link key={p.id} to={`/playlist/${p.id}`}>
          <Card className="glass-card p-4 hover:bg-surface-2 transition">
            <div className="flex items-center gap-2 mb-1">
              <ListVideo className="h-4 w-4" />
              <p className="font-display font-semibold">{p.title}</p>
            </div>
            {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default Search;
