import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Heart, Trash2, ImagePlus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ReportDialog } from "./ReportDialog";

interface Post {
  id: string;
  channel_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  liked: boolean;
}

interface ChannelInfo {
  id: string;
  display_name: string | null;
  channel_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export const CommunityPosts = ({ channelId, channel }: { channelId: string; channel: ChannelInfo }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);

  const isOwner = user?.id === channelId;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, channel_id, content, image_url, created_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });

    const ids = (data ?? []).map(p => p.id);
    let likeCounts: Record<string, number> = {};
    let mine: Set<string> = new Set();
    if (ids.length) {
      const { data: pl } = await supabase.from("post_likes").select("post_id, user_id").in("post_id", ids);
      (pl ?? []).forEach(r => {
        likeCounts[r.post_id] = (likeCounts[r.post_id] ?? 0) + 1;
        if (user && r.user_id === user.id) mine.add(r.post_id);
      });
    }
    setPosts((data ?? []).map(p => ({ ...p, likes: likeCounts[p.id] ?? 0, liked: mine.has(p.id) })));
    setLoading(false);
  }, [channelId, user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user || !content.trim()) return;
    setPosting(true);
    let imageUrl: string | null = null;
    if (image) {
      if (image.size > 5 * 1024 * 1024) { toast.error("Imagen máx 5MB"); setPosting(false); return; }
      const ext = (image.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/post-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, image, { contentType: image.type, cacheControl: "3600" });
      if (error) { toast.error("Error subiendo imagen"); setPosting(false); return; }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("posts").insert({ channel_id: user.id, content: content.trim(), image_url: imageUrl });
    setPosting(false);
    if (error) toast.error("No se pudo publicar");
    else { toast.success("Publicado"); setContent(""); setImage(null); load(); }
  };

  const toggleLike = async (post: Post) => {
    if (!user) { toast.error("Inicia sesión"); return; }
    if (post.liked) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else { toast.success("Eliminado"); setPosts(prev => prev.filter(p => p.id !== id)); }
  };

  const name = channel.channel_name || channel.display_name || channel.username || "Canal";
  const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isOwner && (
        <Card className="glass-card p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={channel.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                placeholder="Comparte algo con tu comunidad..."
                className="bg-surface-1 min-h-20 resize-none"
              />
              {image && (
                <div className="relative inline-block">
                  <img src={URL.createObjectURL(image)} alt="" className="max-h-40 rounded-lg" />
                  <button onClick={() => setImage(null)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/90 flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="cursor-pointer text-muted-foreground hover:text-foreground transition">
                  <ImagePlus className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{content.length}/500</span>
                  <Button onClick={submit} disabled={posting || !content.trim()} size="sm">
                    {posting ? "Publicando..." : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="h-7 w-7 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
      ) : posts.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground text-sm">Este canal aún no ha publicado nada.</p>
      ) : posts.map(post => (
        <Card key={post.id} className="glass-card p-4">
          <div className="flex gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={channel.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-display font-semibold text-sm">{name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <ReportDialog targetType="post" targetId={post.id} variant="ghost" />
                  {isOwner && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(post.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap mt-2">{post.content}</p>
              {post.image_url && (
                <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-96 object-cover w-full" />
              )}
              <button onClick={() => toggleLike(post)} className={`mt-3 inline-flex items-center gap-2 text-sm transition ${post.liked ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
