import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { useVideos } from "@/hooks/useVideos";

const Shorts = () => {
  const { videos, loading } = useVideos({ isShort: true, limit: 60 });

  useEffect(() => { document.title = "Shorts — MeTube"; }, []);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto animate-slide-up">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">Shorts</h1>
          <p className="text-muted-foreground text-sm mt-1">Vídeos verticales rápidos.</p>
        </div>
        <VideoGrid videos={videos} loading={loading} emptyText="Aún no hay shorts." />
      </div>
    </AppLayout>
  );
};

export default Shorts;
