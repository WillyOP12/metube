import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Comments } from "@/components/Comments";
import { ReportDialog } from "@/components/ReportDialog";
import { useVideo, useVideos } from "@/hooks/useVideos";
import { useLikes } from "@/hooks/useLikes";
import { useSubscription } from "@/hooks/useSubscription";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, BellPlus, BellRing, Share2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { formatViews } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { VideoCard } from "@/components/VideoCard";
import { AddToPlaylistDialog } from "@/components/AddToPlaylistDialog";
import { toast } from "sonner";

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const { video, loading } = useVideo(id);
  const { likes, dislikes, mine, toggle } = useLikes(id);
  const { subscribed, count, toggle: toggleSub, isOwner } = useSubscription(video?.channel_id);
  const { videos: related } = useVideos({ limit: 8 });
  const viewedRef = useRef(false);

  useEffect(() => {
    if (video?.title) document.title = `${video.title} — MeTube`;
  }, [video?.title]);

  // Increment view once
  useEffect(() => {
    if (video && !viewedRef.current) {
      viewedRef.current = true;
      supabase.from("videos").update({ views: video.views + 1 }).eq("id", video.id);
    }
  }, [video]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!video) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Vídeo no encontrado.</p>
          <Button asChild className="mt-4"><Link to="/">Volver al inicio</Link></Button>
        </div>
      </AppLayout>
    );
  }

  const channelName = video.channel?.channel_name || video.channel?.display_name || video.channel?.username || "Canal";
  const initials = channelName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: video.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Enlace copiado"); }
    } catch { /* cancelled */ }
  };

  return (
    <AppLayout>
      <div className="grid lg:grid-cols-[1fr_360px] gap-8 max-w-[1600px] mx-auto animate-fade-in">
        <div className="space-y-5 min-w-0">
          <VideoPlayer url={video.video_url} source={video.source} poster={video.thumbnail_url} vertical={video.is_short} />

          <div>
            <h1 className="font-display text-2xl font-bold leading-tight">{video.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {formatViews(video.views)} vistas · {formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Link to={`/c/${video.channel_id}`} className="flex items-center gap-3 group">
                <Avatar className="h-11 w-11 border border-border">
                  <AvatarImage src={video.channel?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-surface-2">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-display font-semibold group-hover:text-foreground">{channelName}</p>
                  <p className="text-xs text-muted-foreground">{count} suscriptores</p>
                </div>
              </Link>
              {!isOwner && (
                <Button onClick={toggleSub} variant={subscribed ? "outline" : "default"} className="gap-2 ml-2">
                  {subscribed ? <><BellRing className="h-4 w-4" />Suscrito</> : <><BellPlus className="h-4 w-4" />Suscribirse</>}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-full border border-border overflow-hidden">
                <Button variant="ghost" size="sm" onClick={() => toggle("like")} className={`gap-2 rounded-none ${mine === "like" ? "bg-surface-2" : ""}`}>
                  <ThumbsUp className="h-4 w-4" /> {likes}
                </Button>
                <div className="h-5 w-px bg-border" />
                <Button variant="ghost" size="sm" onClick={() => toggle("dislike")} className={`gap-2 rounded-none ${mine === "dislike" ? "bg-surface-2" : ""}`}>
                  <ThumbsDown className="h-4 w-4" /> {dislikes}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={share} className="gap-2"><Share2 className="h-4 w-4" />Compartir</Button>
              <AddToPlaylistDialog videoId={video.id} />
              <ReportDialog targetType="video" targetId={video.id} variant="outline" />
            </div>
          </div>

          {video.description && (
            <div className="rounded-xl bg-surface-1 border border-border p-4">
              <p className="text-sm whitespace-pre-wrap">{video.description}</p>
            </div>
          )}

          <div className="pt-2">
            <Comments videoId={video.id} />
          </div>
        </div>

        <aside className="space-y-4">
          <h3 className="font-display text-lg font-semibold">Más vídeos</h3>
          <div className="space-y-5">
            {related.filter(v => v.id !== video.id).slice(0, 8).map(v => (
              <VideoCard key={v.id} video={v} />
            ))}
            {related.length <= 1 && <p className="text-sm text-muted-foreground">Sin más vídeos por ahora.</p>}
          </div>
        </aside>
      </div>
    </AppLayout>
  );
};

export default Watch;
