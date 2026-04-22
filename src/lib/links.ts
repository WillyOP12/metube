import {
  Globe, Twitter, Instagram, Youtube, Github, Music, MessageCircle,
  Twitch, Linkedin, Send, Coffee, Link as LinkIcon,
} from "lucide-react";

export type Platform =
  | "website" | "twitter" | "instagram" | "youtube" | "tiktok" | "github"
  | "discord" | "reddit" | "twitch" | "linkedin" | "telegram" | "patreon"
  | "metube" | "other";

export interface RichLink {
  platform: Platform;
  url: string;
  label?: string;
}

export const PLATFORM_META: Record<Platform, { label: string; icon: typeof Globe; placeholder: string }> = {
  website:   { label: "Web",       icon: Globe,         placeholder: "https://tuweb.com" },
  twitter:   { label: "Twitter/X", icon: Twitter,       placeholder: "https://twitter.com/usuario" },
  instagram: { label: "Instagram", icon: Instagram,     placeholder: "https://instagram.com/usuario" },
  youtube:   { label: "YouTube",   icon: Youtube,       placeholder: "https://youtube.com/@canal" },
  tiktok:    { label: "TikTok",    icon: Music,         placeholder: "https://tiktok.com/@usuario" },
  github:    { label: "GitHub",    icon: Github,        placeholder: "https://github.com/usuario" },
  discord:   { label: "Discord",   icon: MessageCircle, placeholder: "https://discord.gg/xxxx" },
  reddit:    { label: "Reddit",    icon: MessageCircle, placeholder: "https://reddit.com/r/xxxx" },
  twitch:    { label: "Twitch",    icon: Twitch,        placeholder: "https://twitch.tv/usuario" },
  linkedin:  { label: "LinkedIn",  icon: Linkedin,      placeholder: "https://linkedin.com/in/usuario" },
  telegram:  { label: "Telegram",  icon: Send,          placeholder: "https://t.me/usuario" },
  patreon:   { label: "Patreon",   icon: Coffee,        placeholder: "https://patreon.com/usuario" },
  metube:    { label: "MeTube",    icon: LinkIcon,      placeholder: "/c/usuario o /watch/id" },
  other:     { label: "Otro",      icon: LinkIcon,      placeholder: "https://..." },
};

export const PLATFORM_ORDER: Platform[] = [
  "website", "twitter", "instagram", "youtube", "tiktok", "github",
  "discord", "reddit", "twitch", "linkedin", "telegram", "patreon",
  "metube", "other",
];

export const normalizeLinkUrl = (url: string): string => {
  const v = url.trim();
  if (!v) return "";
  if (v.startsWith("/")) return v; // ruta interna metube
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return "https://" + v;
};

export const parseLinks = (raw: unknown): RichLink[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is RichLink => x && typeof x === "object" && typeof (x as any).url === "string")
    .map((x) => ({
      platform: (PLATFORM_ORDER.includes((x as any).platform) ? (x as any).platform : "other") as Platform,
      url: String((x as any).url),
      label: typeof (x as any).label === "string" ? (x as any).label : undefined,
    }));
};
