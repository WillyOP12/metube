import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatViews, formatDuration } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { VideoWithChannel } from "@/hooks/useVideos";

export const VideoCard = ({ video }: { video: VideoWithChannel }) => {
  const channelName = video.channel?.channel_name || video.channel?.display_name || video.channel?.username || "Canal";
  const initials = channelName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Link to={`/watch/${video.id}`} className="group block animate-fade-in">
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface-1">
        <AspectRatio ratio={16 / 9}>
          {video.thumbnail_url ? (
            <img
              src={video.thumbnail_url}
              alt={video.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-surface-2">
              <Play className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
        </AspectRatio>
        {video.duration ? (
          <span className="absolute bottom-2 right-2 text-xs font-medium px-1.5 py-0.5 rounded bg-background/85 text-foreground">
            {formatDuration(video.duration)}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex gap-3">
        <Avatar className="h-9 w-9 border border-border shrink-0">
          <AvatarImage src={video.channel?.avatar_url ?? undefined} />
          <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h3 className="font-display font-semibold leading-snug line-clamp-2 group-hover:text-foreground">
            {video.title}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {channelName}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatViews(video.views)} vistas · {formatDistanceToNow(new Date(video.created_at), { addSuffix: true, locale: es })}
          </p>
        </div>
      </div>
    </Link>
  );
};

export const VideoCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="rounded-xl bg-surface-2 aspect-video" />
    <div className="mt-3 flex gap-3">
      <div className="h-9 w-9 rounded-full bg-surface-2" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-2 rounded w-4/5" />
        <div className="h-3 bg-surface-2 rounded w-2/5" />
      </div>
    </div>
  </div>
);
