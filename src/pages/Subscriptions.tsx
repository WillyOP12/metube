import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { VideoGrid } from "@/components/VideoGrid";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { VideoWithChannel } from "@/hooks/useVideos";

const Inner = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoWithChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { document.title = "Suscripciones — MeTube"; }, []);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      const { data: subs } = await supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user.id);
      const ids = (subs ?? []).map(s => s.channel_id);
      if (!ids.length) { setVideos([]); setLoading(false); return; }
      const { data } = await supabase
        .from("videos")
        .select("*, channel:profiles!videos_channel_id_fkey(id, display_name, username, avatar_url, channel_name)")
        .in("channel_id", ids)
        .order("created_at", { ascending: false })
        .limit(60);
      setVideos((data as unknown as VideoWithChannel[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  return (
    <div className="max-w-7xl mx-auto animate-slide-up">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Suscripciones</h1>
        <p className="text-muted-foreground text-sm mt-1">Lo último de los canales que sigues.</p>
      </div>
      <VideoGrid videos={videos} loading={loading} emptyText="Aún no sigues a ningún canal." />
    </div>
  );
};

const Subscriptions = () => (
  <ProtectedRoute>
    <AppLayout><Inner /></AppLayout>
  </ProtectedRoute>
);

export default Subscriptions;
