import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useSubscription = (channelId: string | undefined) => {
  const { user } = useAuth();
  const [subscribed, setSubscribed] = useState(false);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    const [{ count: c }, mine] = await Promise.all([
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("channel_id", channelId),
      user ? supabase.from("subscriptions").select("id").eq("channel_id", channelId).eq("subscriber_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    setCount(c ?? 0);
    setSubscribed(!!mine.data);
    setLoading(false);
  }, [channelId, user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = async () => {
    if (!user || !channelId || user.id === channelId) return;
    if (subscribed) {
      await supabase.from("subscriptions").delete().eq("channel_id", channelId).eq("subscriber_id", user.id);
    } else {
      await supabase.from("subscriptions").insert({ channel_id: channelId, subscriber_id: user.id });
    }
    refresh();
  };

  return { subscribed, count, loading, toggle, isOwner: user?.id === channelId };
};
