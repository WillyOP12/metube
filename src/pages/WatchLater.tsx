import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VideoGrid } from "@/components/VideoGrid";
import { useWatchLater } from "@/hooks/useWatchLater";
import { Clock } from "lucide-react";

const Inner = () => {
  const { videos, loading } = useWatchLater();
  useEffect(() => { document.title = "Ver más tarde — MeTube"; }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6" />
        <div>
          <h1 className="font-display text-3xl font-bold">Ver más tarde</h1>
          <p className="text-sm text-muted-foreground">Tus vídeos guardados.</p>
        </div>
      </div>
      <VideoGrid videos={videos} loading={loading} emptyMessage="Sin vídeos guardados. Usa el botón 'Ver más tarde' en cualquier vídeo." />
    </div>
  );
};

const WatchLater = () => (
  <ProtectedRoute>
    <AppLayout><Inner /></AppLayout>
  </ProtectedRoute>
);
export default WatchLater;
