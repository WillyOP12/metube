import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useVideos } from "@/hooks/useVideos";
import { useLikes } from "@/hooks/useLikes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, MessageCircle, Share2, Film } from "lucide-react";
import { formatViews } from "@/lib/format";
import { toast } from "sonner";
import { isYouTube, youtubeEmbed, isVimeo, vimeoEmbed } from "@/lib/format";
import type { VideoWithChannel } from "@/hooks/useVideos";

const ShortItem = ({ video, active }: { video: VideoWithChannel; active: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { likes, dislikes, mine, toggle } = useLikes(video.id);
  const channelName = video.channel?.channel_name || video.channel?.display_name || video.channel?.username || "Canal";
  const initials = channelName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [active]);

  const isExternal = video.source === "external";
  const yt = isExternal && isYouTube(video.video_url) ? youtubeEmbed(video.video_url) : null;
  const vm = isExternal && !yt && isVimeo(video.video_url) ? vimeoEmbed(video.video_url) : null;
  const embed = yt || vm;

  const share = async () => {
    const url = `${window.location.origin}/watch/${video.id}`;
    try {
      if (navigator.share) await navigator.share({ title: video.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Enlace copiado"); }
    } catch { /* */ }
  };

  return (
    <section className="snap-start h-[calc(100dvh-4rem)] flex items-center justify-center relative">
      <div className="relative h-full max-h-[calc(100dvh-4rem)] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-border">
        {embed ? (
          <iframe src={embed + "?autoplay=1&mute=1&controls=1"} className="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            ref={videoRef}
            src={video.video_url}
            poster={video.thumbnail_url ?? undefined}
            loop muted={!active} playsInline controls={false}
            onClick={(e) => { const el = e.currentTarget; el.paused ? el.play() : el.pause(); }}
            className="h-full w-full object-cover"
          />
        )}

        {/* Overlay info */}
        <div className="absolute left-0 right-16 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
          <Link to={`/c/${video.channel_id}`} className="flex items-center gap-2 mb-2">
            <Avatar className="h-9 w-9 border border-white/20">
              <AvatarImage src={video.channel?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-white text-sm">{channelName}</span>
          </Link>
          <h3 className="text-white font-display text-base leading-snug line-clamp-2">{video.title}</h3>
          <p className="text-white/70 text-xs mt-1">{formatViews(video.views)} vistas</p>
        </div>

        {/* Actions */}
        <div className="absolute right-2 bottom-6 flex flex-col items-center gap-4">
          <button onClick={() => toggle("like")} className="flex flex-col items-center gap-1 text-white">
            <span className={`h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition ${mine === "like" ? "bg-white text-black" : ""}`}>
              <ThumbsUp className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">{likes}</span>
          </button>
          <button onClick={() => toggle("dislike")} className="flex flex-col items-center gap-1 text-white">
            <span className={`h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition ${mine === "dislike" ? "bg-white text-black" : ""}`}>
              <ThumbsDown className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium">{dislikes}</span>
          </button>
          <Link to={`/watch/${video.id}`} className="flex flex-col items-center gap-1 text-white">
            <span className="h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-xs">Ver</span>
          </Link>
          <button onClick={share} className="flex flex-col items-center gap-1 text-white">
            <span className="h-11 w-11 rounded-full bg-white/15 backdrop-blur flex items-center justify-center hover:bg-white/25 transition">
              <Share2 className="h-5 w-5" />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};

const Shorts = () => {
  const { id } = useParams<{ id: string }>();
  const { videos, loading } = useVideos({ isShort: true, limit: 30 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => { document.title = "Shorts — MeTube"; }, []);

  // Si llega con /shorts/:id, scrollear al short específico
  useEffect(() => {
    if (!id || !videos.length || !containerRef.current) return;
    const idx = videos.findIndex(v => v.id === id);
    if (idx < 0) return;
    const sections = containerRef.current.querySelectorAll<HTMLElement>("section");
    sections[idx]?.scrollIntoView({ behavior: "instant" as ScrollBehavior, block: "start" });
    setActiveIdx(idx);
  }, [id, videos]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const sections = root.querySelectorAll<HTMLElement>("section");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          const idx = Array.from(sections).indexOf(e.target as HTMLElement);
          if (idx >= 0) setActiveIdx(idx);
        }
      });
    }, { root, threshold: [0.6] });
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, [videos.length]);

  return (
    <AppLayout>
      {loading ? (
        <div className="flex items-center justify-center h-[60vh]"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <Film className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún no hay shorts.</p>
          <Button asChild className="mt-4"><Link to="/upload">Subir el primero</Link></Button>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="h-[calc(100dvh-4rem)] overflow-y-scroll snap-y snap-mandatory -mx-4 md:-mx-6 -my-6 scrollbar-hide"
        >
          {videos.map((v, i) => (
            <ShortItem key={v.id} video={v} active={i === activeIdx} />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default Shorts;
