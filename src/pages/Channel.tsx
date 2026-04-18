import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { VideoGrid } from "@/components/VideoGrid";
import { CommunityPosts } from "@/components/CommunityPosts";
import { ChannelHeader } from "@/components/ChannelHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useVideos } from "@/hooks/useVideos";
import { useSubscription } from "@/hooks/useSubscription";
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

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto animate-slide-up">
        <ChannelHeader
          profile={profile}
          videosCount={videos.length}
          count={count}
          subscribed={subscribed}
          isOwner={isOwner}
          user={user}
          onToggle={toggle}
        />

        <Tabs defaultValue="videos" className="mt-8">
          <TabsList className="bg-surface-1 border border-border">
            <TabsTrigger value="videos">Vídeos</TabsTrigger>
            <TabsTrigger value="community">Comunidad</TabsTrigger>
          </TabsList>
          <TabsContent value="videos" className="mt-6">
            <VideoGrid videos={videos} loading={videosLoading} emptyText="Este canal aún no tiene vídeos." />
          </TabsContent>
          <TabsContent value="community" className="mt-6">
            <CommunityPosts channelId={profile.id} channel={profile} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Channel;
