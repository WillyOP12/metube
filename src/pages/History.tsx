import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VideoGrid } from "@/components/VideoGrid";
import { Button } from "@/components/ui/button";
import { useHistory } from "@/hooks/useHistory";
import { History as HistoryIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Inner = () => {
  const { videos, loading, clearAll } = useHistory();
  useEffect(() => { document.title = "Historial — MeTube"; }, []);

  const handleClear = async () => {
    if (!confirm("¿Borrar todo el historial?")) return;
    await clearAll();
    toast.success("Historial borrado");
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <HistoryIcon className="h-6 w-6" />
          <div>
            <h1 className="font-display text-3xl font-bold">Historial</h1>
            <p className="text-sm text-muted-foreground">Vídeos que has visto recientemente.</p>
          </div>
        </div>
        {videos.length > 0 && (
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <Trash2 className="h-4 w-4" /> Borrar todo
          </Button>
        )}
      </div>
      <VideoGrid videos={videos} loading={loading} emptyMessage="Tu historial está vacío. ¡Empieza a ver vídeos!" />
    </div>
  );
};

const History = () => (
  <ProtectedRoute>
    <AppLayout><Inner /></AppLayout>
  </ProtectedRoute>
);
export default History;
