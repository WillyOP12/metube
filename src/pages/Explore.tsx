import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { useVideos } from "@/hooks/useVideos";

const Explore = () => {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const { videos, loading } = useVideos({ search: q || undefined, isShort: false, limit: 60 });

  useEffect(() => {
    document.title = q ? `Buscar "${q}" — MeTube` : "Explorar — MeTube";
  }, [q]);

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto animate-slide-up">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {q ? `Resultados para "${q}"` : "Explorar"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {q ? `${videos.length} vídeos encontrados` : "Lo último de la comunidad."}
          </p>
        </div>
        <VideoGrid videos={videos} loading={loading} emptyText={q ? "Sin resultados." : "Aún no hay vídeos en MeTube."} />
      </div>
    </AppLayout>
  );
};

export default Explore;
