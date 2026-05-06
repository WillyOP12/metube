import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, Hammer, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const VideoEditorInner = () => {
  useEffect(() => { document.title = "Editor de vídeo — MeTube"; }, []);
  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/studio"><ArrowLeft className="h-4 w-4 mr-1" />Volver a Studio</Link>
        </Button>
      </div>
      <Card className="glass-card p-10 text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
          <Film className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-2">Editor de vídeo</h1>
        <p className="text-muted-foreground max-w-xl mx-auto mb-6">
          Editor multipista con clips, textos, stickers, control de volumen y exportación a MP4
          (vídeo normal o short). Estamos construyéndolo en la próxima iteración.
        </p>
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-surface-1 border border-border rounded-full px-4 py-2">
          <Hammer className="h-4 w-4" /> En construcción
        </div>
        <div className="mt-8 grid sm:grid-cols-3 gap-3 text-left">
          {[
            { t: "Pistas paralelas", d: "Vídeo, audio y capa de texto/stickers" },
            { t: "Clips editables", d: "Recortar, mover, ajustar volumen" },
            { t: "Exportar", d: "MP4 normal o vertical para shorts" },
          ].map((f) => (
            <div key={f.t} className="rounded-lg border border-border bg-surface-1 p-4">
              <p className="font-medium text-sm mb-1">{f.t}</p>
              <p className="text-xs text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const VideoEditor = () => (
  <ProtectedRoute>
    <AppLayout><VideoEditorInner /></AppLayout>
  </ProtectedRoute>
);

export default VideoEditor;
