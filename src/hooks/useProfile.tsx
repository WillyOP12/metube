import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { parseLinks, type RichLink } from "@/lib/links";

export interface SocialLinks {
  twitter?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
  github?: string;
}

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  is_channel: boolean;
  channel_name: string | null;
  subscriber_count: number;
  social_links: SocialLinks;
  accent_color: string | null;
  location: string | null;
  language: string | null;
  links: RichLink[];
  suspended_until: string | null;
  suspension_reason: string | null;
}

const hydrate = (raw: any): Profile | null => {
  if (!raw) return null;
  return { ...raw, links: parseLinks(raw.links) } as Profile;
};

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    setProfile(hydrate(data));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { profile, loading, refresh };
};
