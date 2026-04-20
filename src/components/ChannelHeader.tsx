import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BellPlus, BellRing, Pencil, MapPin, Globe, Twitter, Instagram, Youtube, Github, Link as LinkIcon } from "lucide-react";
import { ReportDialog } from "./ReportDialog";
import type { Profile, SocialLinks } from "@/hooks/useProfile";

interface Props {
  profile: Profile;
  videosCount: number;
  count: number;
  subscribed: boolean;
  isOwner: boolean;
  user: { id: string } | null;
  onToggle: () => void;
}

const SOCIAL_META: Record<keyof SocialLinks, { icon: typeof Twitter; label: string; prefix: string }> = {
  twitter: { icon: Twitter, label: "Twitter", prefix: "https://twitter.com/" },
  instagram: { icon: Instagram, label: "Instagram", prefix: "https://instagram.com/" },
  youtube: { icon: Youtube, label: "YouTube", prefix: "" },
  tiktok: { icon: LinkIcon, label: "TikTok", prefix: "https://tiktok.com/@" },
  website: { icon: Globe, label: "Web", prefix: "" },
  github: { icon: Github, label: "GitHub", prefix: "https://github.com/" },
};

const normalizeUrl = (key: keyof SocialLinks, value: string) => {
  const v = value.trim();
  if (!v) return null;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  const meta = SOCIAL_META[key];
  if (!meta.prefix) return `https://${v}`;
  return meta.prefix + v.replace(/^@/, "");
};

export const ChannelHeader = ({ profile, videosCount, count, subscribed, isOwner, user, onToggle }: Props) => {
  const name = profile.channel_name || profile.display_name || profile.username || "Canal";
  const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
  const accent = profile.accent_color;
  const links = profile.social_links || {};

  return (
    <div
      className="rounded-2xl overflow-hidden border border-border bg-surface-1"
      style={accent ? ({ ["--channel-accent" as any]: accent } as React.CSSProperties) : undefined}
    >
      <div
        className="h-40 sm:h-56 relative"
        style={{
          background: accent
            ? `linear-gradient(135deg, ${accent}55, transparent)`
            : undefined,
        }}
      >
        {profile.banner_url ? (
          <img src={profile.banner_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
      </div>
      <div className="p-5 sm:p-7 flex flex-col sm:flex-row gap-5 sm:items-end">
        <Avatar
          className="h-24 w-24 border-2 border-background -mt-16 shrink-0"
          style={accent ? { boxShadow: `0 0 0 3px ${accent}` } : undefined}
        >
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="bg-surface-2 text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight truncate">{name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            @{profile.username} · {count} suscriptores · {videosCount} vídeos
          </p>
          {profile.bio && <p className="text-sm text-foreground/80 mt-3 max-w-2xl whitespace-pre-wrap">{profile.bio}</p>}

          {(profile.location || profile.language) && (
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              {profile.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{profile.location}</span>}
              {profile.language && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{profile.language}</span>}
            </div>
          )}

          {Object.keys(links).some((k) => links[k as keyof SocialLinks]) && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {(Object.keys(SOCIAL_META) as (keyof SocialLinks)[]).map((key) => {
                const value = links[key];
                if (!value) return null;
                const Icon = SOCIAL_META[key].icon;
                const url = normalizeUrl(key, value);
                if (!url) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-8 w-8 rounded-full bg-surface-2 hover:bg-surface-3 border border-border flex items-center justify-center transition"
                    style={accent ? { borderColor: `${accent}55` } : undefined}
                    aria-label={SOCIAL_META[key].label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {isOwner ? (
            <>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/studio"><Pencil className="h-4 w-4" />Editar canal</Link>
              </Button>
            </>
          ) : user ? (
            <>
              <Button
                onClick={onToggle}
                variant={subscribed ? "secondary" : "default"}
                className="gap-2 font-medium"
                style={
                  !subscribed && accent
                    ? { backgroundColor: accent, color: "hsl(var(--primary-foreground))", borderColor: accent }
                    : undefined
                }
              >
                {subscribed ? (
                  <><BellRing className="h-4 w-4" />Suscrito</>
                ) : (
                  <><BellPlus className="h-4 w-4" />Suscribirse</>
                )}
              </Button>
              <ReportDialog targetType="channel" targetId={profile.id} variant="outline" />
            </>
          ) : (
            <Button asChild className="gap-2"><Link to="/auth"><BellPlus className="h-4 w-4" />Suscribirse</Link></Button>
          )}
        </div>
      </div>
    </div>
  );
};
