import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ReportDialog } from "@/components/ReportDialog";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface FeedPost {
  id: string;
  channel_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  liked: boolean;
  channel: {
    id: string;
    display_name: string | null;
    channel_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

const Community = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"subs" | "all">("subs");

  useEffect(() => {
    document.title = "Comunidad — MeTube";
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    let channelIds: string[] | null = null;
    if (scope === "subs" && user) {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("channel_id")
        .eq("subscriber_id", user.id);
      channelIds = (subs ?? []).map(s => s.channel_id);
      if (channelIds.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }
    }

    let query = supabase
      .from("posts")
      .select("id, channel_id, content, image_url, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (channelIds) query = query.in("channel_id", channelIds);

    const { data: rawPosts } = await query;
    const list = rawPosts ?? [];
    if (list.length === 0) {
      setPosts([]);
      setLoading(false);
      return;
    }

    const ids = list.map(p => p.id);
    const chIds = Array.from(new Set(list.map(p => p.channel_id)));

    const [{ data: likes }, { data: profiles }] = await Promise.all([
      supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
      supabase
        .from("profiles")
        .select("id, display_name, channel_name, username, avatar_url")
        .in("id", chIds),
    ]);

    const counts: Record<string, number> = {};
    const mine = new Set<string>();
    (likes ?? []).forEach(r => {
      counts[r.post_id] = (counts[r.post_id] ?? 0) + 1;
      if (user && r.user_id === user.id) mine.add(r.post_id);
    });
    const profMap = new Map((profiles ?? []).map(p => [p.id, p]));

    setPosts(
      list.map(p => ({
        ...p,
        likes: counts[p.id] ?? 0,
        liked: mine.has(p.id),
        channel: profMap.get(p.channel_id) ?? null,
      }))
    );
    setLoading(false);
  }, [scope, user]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async (post: FeedPost) => {
    if (!user) { toast.error("Inicia sesión"); return; }
    if (post.liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto animate-slide-up">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl font-bold">Comunidad</h1>
          <div className="flex gap-1 bg-surface-1 border border-border rounded-lg p-1">
            <Button
              variant={scope === "subs" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setScope("subs")}
              disabled={!user}
            >
              Suscripciones
            </Button>
            <Button
              variant={scope === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setScope("all")}
            >
              Descubrir
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-7 w-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center py-20 text-muted-foreground text-sm">
            {scope === "subs"
              ? "Suscríbete a canales para ver sus publicaciones aquí."
              : "Aún no hay publicaciones."}
          </p>
        ) : (
          <div className="space-y-4">
            {posts.map(post => {
              const name = post.channel?.channel_name || post.channel?.display_name || post.channel?.username || "Canal";
              const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
              return (
                <Card key={post.id} className="glass-card p-4">
                  <div className="flex gap-3">
                    <Link to={`/c/${post.channel_id}`} className="shrink-0">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={post.channel?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <Link to={`/c/${post.channel_id}`} className="font-display font-semibold text-sm hover:underline">
                            {name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <ReportDialog targetType="post" targetId={post.id} variant="ghost" />
                      </div>
                      <p className="text-sm whitespace-pre-wrap mt-2">{post.content}</p>
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-96 object-cover w-full" />
                      )}
                      <button
                        onClick={() => toggleLike(post)}
                        className={`mt-3 inline-flex items-center gap-2 text-sm transition ${post.liked ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Community;
