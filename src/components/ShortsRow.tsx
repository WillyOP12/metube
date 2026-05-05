import { Link } from "react-router-dom";
import { Film } from "lucide-react";
import { formatViews } from "@/lib/format";
import type { VideoWithChannel } from "@/hooks/useVideos";

interface Props {
  shorts: VideoWithChannel[];
  loading?: boolean;
}

export const ShortsRow = ({ shorts, loading }: Props) => {
  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 w-40 sm:w-48 aspect-[9/16] rounded-xl bg-surface-2 animate-pulse" />
        ))}
      </div>
    );
  }
  if (!shorts.length) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Film className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Aún no hay shorts.</p>
      </div>
    );
  }
  return (
    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:-mx-0 md:px-0">
      {shorts.map((s) => (
        <Link
          key={s.id}
          to={`/shorts/${s.id}`}
          className="group shrink-0 w-40 sm:w-48 relative aspect-[9/16] rounded-xl overflow-hidden bg-surface-2 border border-border hover-lift"
        >
          {s.thumbnail_url ? (
            <img src={s.thumbnail_url} alt={s.title} loading="lazy" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
          ) : (
            // Fallback: usa el propio vídeo (primer frame) como póster
            <video
              src={s.video_url}
              muted
              playsInline
              preload="metadata"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform pointer-events-none bg-black"
              onLoadedMetadata={(e) => { try { (e.currentTarget as HTMLVideoElement).currentTime = 0.1; } catch { /* */ } }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-medium">
            <Film className="h-2.5 w-2.5" /> Short
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-display text-sm leading-snug line-clamp-2">{s.title}</h3>
            <p className="text-white/70 text-[11px] mt-1">{formatViews(s.views)} vistas</p>
          </div>
        </Link>
      ))}
    </div>
  );
};
