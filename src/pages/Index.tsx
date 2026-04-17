import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Play, Upload, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useVideos } from "@/hooks/useVideos";
import { VideoGrid } from "@/components/VideoGrid";

const Index = () => {
  const { user } = useAuth();
  const { videos, loading } = useVideos({ limit: 12 });

  useEffect(() => {
    document.title = "MeTube — vídeos, shorts y comunidad";
    const m = document.querySelector('meta[name="description"]');
    if (m) m.setAttribute("content", "MeTube: comparte vídeos y shorts, crea tu canal, sigue a creadores.");
  }, []);

  return (
    <AppLayout>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface-1 p-8 md:p-14 mb-10 animate-slide-up">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,hsl(0_0%_18%),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground border border-border rounded-full px-3 py-1 mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" /> Bienvenido a MeTube
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-gradient leading-[1.05]">
            Vídeo en blanco y negro.<br />Sin distracciones.
          </h1>
          <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-xl">
            Sube vídeos largos o shorts, crea tu canal, organiza listas, comenta y conecta con tu comunidad.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {user ? (
              <>
                <Button asChild size="lg"><Link to="/upload"><Upload className="mr-2 h-4 w-4" />Subir vídeo</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/explore"><Play className="mr-2 h-4 w-4" />Explorar</Link></Button>
              </>
            ) : (
              <>
                <Button asChild size="lg"><Link to="/auth">Empezar gratis</Link></Button>
                <Button asChild size="lg" variant="outline"><Link to="/explore"><Play className="mr-2 h-4 w-4" />Explorar</Link></Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Recent videos */}
      <section>
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Recomendado</h2>
          <Link to="/explore" className="text-sm text-muted-foreground hover:text-foreground transition">Ver todo →</Link>
        </div>
        <VideoGrid
          videos={videos}
          loading={loading}
          emptyText={user ? "Aún no hay vídeos. ¡Sé el primero en subir uno!" : "Aún no hay vídeos. Crea una cuenta para empezar."}
        />
      </section>

      {/* Feature cards */}
      <section className="grid sm:grid-cols-3 gap-4 mt-10">
        {[
          { icon: Upload, title: "Sube tus vídeos", desc: "Archivo propio o URL externa." },
          { icon: Play, title: "Reproduce sin fricción", desc: "Player limpio en negro puro." },
          { icon: Users, title: "Tu canal, tu comunidad", desc: "Convierte tu cuenta en canal en un clic." },
        ].map((f) => (
          <div key={f.title} className="glass-card p-6 rounded-xl hover-lift">
            <f.icon className="h-6 w-6 mb-3" />
            <h3 className="font-display font-semibold text-lg mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </section>
    </AppLayout>
  );
};

export default Index;
