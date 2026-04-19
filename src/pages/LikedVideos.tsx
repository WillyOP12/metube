import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VideoGrid } from "@/components/VideoGrid";
import { useLikedVideos } from "@/hooks/useHistory";
import { ThumbsUp } from "lucide-react";

const Inner = () => {
  const { videos, loading } = useLikedVideos();
  useEffect(() => { document.title = "Me gusta — MeTube"; }, []);

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <ThumbsUp className="h-6 w-6" />
        <div>
          <h1 className="font-display text-3xl font-bold">Me gusta</h1>
          <p className="text-sm text-muted-foreground">Vídeos a los que has dado like.</p>
        </div>
      </div>
      <VideoGrid videos={videos} loading={loading} emptyMessage="Aún no has dado like a ningún vídeo." />
    </div>
  );
};

const LikedVideos = () => (
  <ProtectedRoute>
    <AppLayout><Inner /></AppLayout>
  </ProtectedRoute>
);
export default LikedVideos;
