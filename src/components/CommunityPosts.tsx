import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, Trash2, ImagePlus, X, Pencil, Check, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ReportDialog } from "./ReportDialog";
import { MentionTextarea } from "./MentionTextarea";
import { RichText } from "./RichText";
import { Link } from "react-router-dom";
import { recordMentions } from "@/lib/mentions";
import { extractHashtags } from "./RichText";

interface PostAuthor {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Post {
  id: string;
  channel_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  likes: number;
  liked: boolean;
  comment_count: number;
}

interface ChannelInfo {
  id: string;
  display_name: string | null;
  channel_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface PostComment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: PostAuthor | null;
}

const PostComments = ({ postId }: { postId: string }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<PostComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("post_comments")
      .select("id, user_id, content, created_at")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map<string, PostAuthor>();
    (profs ?? []).forEach((p: any) => map.set(p.id, p));
    setItems((data ?? []).map((r: any) => ({ ...r, author: map.get(r.user_id) ?? null })));
    setLoading(false);
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión"); return; }
    if (!text.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("post_comments").insert({
      post_id: postId, user_id: user.id, content: text.trim(),
    });
    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      await recordMentions({ text, sourceType: "post_comment", sourceId: postId, sourceUserId: user.id });
      setText(""); load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("post_comments").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else load();
  };

  const initialsOf = (n?: string | null) => (n || "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      {user && (
        <div className="flex gap-2">
          <MentionTextarea
            value={text}
            onChange={(v) => setText(v.slice(0, 500))}
            placeholder="Escribe un comentario..."
            className="bg-surface-1 min-h-16 text-sm"
          />
          <Button size="sm" onClick={submit} disabled={submitting || !text.trim()}>Enviar</Button>
        </div>
      )}
      {loading ? (
        <p className="text-xs text-muted-foreground">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sé el primero en comentar.</p>
      ) : (
        items.map((c) => {
          const name = c.author?.display_name || c.author?.username || "Usuario";
          return (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-7 w-7 border border-border shrink-0">
                <AvatarImage src={c.author?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-surface-2 text-[10px]">{initialsOf(name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <Link to={`/c/${c.user_id}`} className="font-medium hover:underline">{name}</Link>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}</span>
                </div>
                <RichText text={c.content} className="text-sm mt-0.5" />
                {user?.id === c.user_id && (
                  <button onClick={() => remove(c.id)} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-1">
                    <Trash2 className="h-3 w-3" />Eliminar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export const CommunityPosts = ({ channelId, channel }: { channelId: string; channel: ChannelInfo }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());

  const isOwner = user?.id === channelId;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("posts")
      .select("id, channel_id, content, image_url, created_at, updated_at")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });

    const ids = (data ?? []).map(p => p.id);
    const likeCounts: Record<string, number> = {};
    const mine: Set<string> = new Set();
    const commentCounts: Record<string, number> = {};

    if (ids.length) {
      const [{ data: pl }, { data: pc }] = await Promise.all([
        supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
      ]);
      (pl ?? []).forEach((r: any) => {
        likeCounts[r.post_id] = (likeCounts[r.post_id] ?? 0) + 1;
        if (user && r.user_id === user.id) mine.add(r.post_id);
      });
      (pc ?? []).forEach((r: any) => {
        commentCounts[r.post_id] = (commentCounts[r.post_id] ?? 0) + 1;
      });
    }
    setPosts((data ?? []).map(p => ({
      ...p,
      likes: likeCounts[p.id] ?? 0,
      liked: mine.has(p.id),
      comment_count: commentCounts[p.id] ?? 0,
    })));
    setLoading(false);
  }, [channelId, user]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión para publicar"); return; }
    if (!content.trim()) { toast.error("Escribe algo antes de publicar"); return; }
    if (user.id !== channelId) { toast.error("Solo puedes publicar en tu propio canal"); return; }
    setPosting(true);
    let imageUrl: string | null = null;
    if (image) {
      if (image.size > 5 * 1024 * 1024) { toast.error("La imagen no puede superar 5MB"); setPosting(false); return; }
      const ext = (image.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/post-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("post-images").upload(path, image, { contentType: image.type, cacheControl: "3600", upsert: false });
      if (upErr) { toast.error(`Error subiendo imagen: ${upErr.message}`); setPosting(false); return; }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }
    const hashtags = extractHashtags(content);
    const { data, error } = await supabase.from("posts").insert({
      channel_id: user.id, content: content.trim(), image_url: imageUrl, hashtags,
    }).select("id").single();
    setPosting(false);
    if (error || !data) {
      toast.error(`No se pudo publicar: ${error?.message}`);
    } else {
      await recordMentions({ text: content, sourceType: "post", sourceId: data.id, sourceUserId: user.id });
      toast.success("¡Publicado!");
      setContent(""); setImage(null);
      load();
    }
  };

  const startEdit = (p: Post) => { setEditingId(p.id); setEditingText(p.content); };
  const cancelEdit = () => { setEditingId(null); setEditingText(""); };
  const saveEdit = async (id: string) => {
    const { error } = await supabase.from("posts").update({
      content: editingText.trim(),
      hashtags: extractHashtags(editingText),
    }).eq("id", id);
    if (error) toast.error("No se pudo editar");
    else {
      toast.success("Editado");
      setPosts(prev => prev.map(p => p.id === id ? { ...p, content: editingText.trim(), updated_at: new Date().toISOString() } : p));
      cancelEdit();
    }
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

  const toggleComments = (id: string) => {
    setOpenComments(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const name = channel.channel_name || channel.display_name || channel.username || "Canal";
  const initials = (name.split(" ").filter(Boolean).map(s => s[0]).join("") || "C").slice(0, 2).toUpperCase();

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
              <MentionTextarea
                value={content}
                onChange={(v) => setContent(v.slice(0, 500))}
                placeholder="Comparte algo con tu comunidad… puedes mencionar @usuarios y usar #hashtags."
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
                    {post.updated_at && post.updated_at !== post.created_at ? " · editado" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <ReportDialog targetType="post" targetId={post.id} variant="ghost" />
                  {isOwner && editingId !== post.id && (
                    <>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(post.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {editingId === post.id ? (
                <div className="mt-2 space-y-2">
                  <MentionTextarea
                    value={editingText}
                    onChange={(v) => setEditingText(v.slice(0, 500))}
                    className="bg-surface-1 min-h-20"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={cancelEdit}>Cancelar</Button>
                    <Button size="sm" onClick={() => saveEdit(post.id)} disabled={!editingText.trim()}>
                      <Check className="h-4 w-4 mr-1" />Guardar
                    </Button>
                  </div>
                </div>
              ) : (
                <RichText text={post.content} className="text-sm mt-2" />
              )}

              {post.image_url && (
                <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-96 object-cover w-full" />
              )}
              <div className="mt-3 flex items-center gap-4">
                <button onClick={() => toggleLike(post)} className={`inline-flex items-center gap-2 text-sm transition ${post.liked ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                  <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} /> {post.likes}
                </button>
                <button onClick={() => toggleComments(post.id)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
                  <MessageSquare className="h-4 w-4" /> {post.comment_count}
                </button>
              </div>
              {openComments.has(post.id) && <PostComments postId={post.id} />}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
