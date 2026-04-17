import { Film } from "lucide-react";
import { VideoCard, VideoCardSkeleton } from "./VideoCard";
import type { VideoWithChannel } from "@/hooks/useVideos";

interface Props {
  videos: VideoWithChannel[];
  loading?: boolean;
  emptyText?: string;
}

export const VideoGrid = ({ videos, loading, emptyText = "Aún no hay vídeos." }: Props) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
        {Array.from({ length: 8 }).map((_, i) => <VideoCardSkeleton key={i} />)}
      </div>
    );
  }
  if (!videos.length) {
    return (
      <div className="glass-card rounded-xl p-12 text-center">
        <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">{emptyText}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
      {videos.map((v) => <VideoCard key={v.id} video={v} />)}
    </div>
  );
};
