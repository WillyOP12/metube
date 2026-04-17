import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { VideoGrid } from "@/components/VideoGrid";
import { ReportDialog } from "@/components/ReportDialog";
import { supabase } from "@/integrations/supabase/client";
import { useVideos } from "@/hooks/useVideos";
import { useSubscription } from "@/hooks/useSubscription";
import { BellPlus, BellRing, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Profile } from "@/hooks/useProfile";

const Channel = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { videos, loading: videosLoading } = useVideos({ channelId: id });
  const { subscribed, count, toggle, isOwner } = useSubscription(id);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      setProfile(data as Profile | null);
      setLoading(false);
      if (data?.display_name) document.title = `${data.display_name} — MeTube`;
    };
    load();
  }, [id]);

  if (loading) {
    return <AppLayout><div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div></AppLayout>;
  }

  if (!profile) {
    return <AppLayout><div className="text-center py-20 text-muted-foreground">Canal no encontrado.</div></AppLayout>;
  }

  const name = profile.channel_name || profile.display_name || profile.username || "Canal";
  const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-slide-up">
        <div className="rounded-2xl overflow-hidden border border-border bg-surface-1">
          <div className="h-40 sm:h-56 bg-surface-2 relative">
            {profile.banner_url && <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
          </div>
          <div className="p-5 sm:p-7 flex flex-col sm:flex-row gap-5 sm:items-end">
            <Avatar className="h-24 w-24 border-2 border-background -mt-16 shrink-0">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface-2 text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl font-bold tracking-tight truncate">{name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                @{profile.username} · {count} suscriptores · {videos.length} vídeos
              </p>
              {profile.bio && <p className="text-sm text-foreground/80 mt-3 max-w-2xl">{profile.bio}</p>}
            </div>
            <div className="flex gap-2 flex-wrap">
              {isOwner ? (
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/profile"><Pencil className="h-4 w-4" />Editar perfil</Link>
                </Button>
              ) : user ? (
                <>
                  <Button onClick={toggle} variant={subscribed ? "outline" : "default"} className="gap-2">
                    {subscribed ? <><BellRing className="h-4 w-4" />Suscrito</> : <><BellPlus className="h-4 w-4" />Suscribirse</>}
                  </Button>
                  <ReportDialog targetType="channel" targetId={profile.id} variant="outline" />
                </>
              ) : (
                <Button asChild><Link to="/auth">Suscribirse</Link></Button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="font-display text-xl font-semibold mb-4">Vídeos</h2>
          <VideoGrid videos={videos} loading={videosLoading} emptyText="Este canal aún no tiene vídeos." />
        </div>
      </div>
    </AppLayout>
  );
};

export default Channel;
