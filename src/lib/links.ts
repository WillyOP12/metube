import type { ComponentType, SVGProps } from "react";
import {
  FaXTwitter, FaInstagram, FaYoutube, FaTiktok, FaGithub,
  FaDiscord, FaReddit, FaTwitch, FaLinkedin, FaTelegram, FaPatreon,
  FaGlobe, FaLink,
} from "react-icons/fa6";

export type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

export type Platform =
  | "website" | "twitter" | "instagram" | "youtube" | "tiktok" | "github"
  | "discord" | "reddit" | "twitch" | "linkedin" | "telegram" | "patreon"
  | "metube" | "other";

export interface RichLink {
  platform: Platform;
  url: string;
  label?: string;
}

interface Meta {
  label: string;
  icon: IconType;
  placeholder: string;
  brand: string;       // brand color for chip accent
  fg: string;          // icon color on brand background
}

export const PLATFORM_META: Record<Platform, Meta> = {
  website:   { label: "Web",       icon: FaGlobe as any,      placeholder: "https://tuweb.com",                 brand: "#3B82F6", fg: "#fff" },
  twitter:   { label: "X",         icon: FaXTwitter as any,   placeholder: "https://x.com/usuario",             brand: "#000000", fg: "#fff" },
  instagram: { label: "Instagram", icon: FaInstagram as any,  placeholder: "https://instagram.com/usuario",     brand: "#E1306C", fg: "#fff" },
  youtube:   { label: "YouTube",   icon: FaYoutube as any,    placeholder: "https://youtube.com/@canal",        brand: "#FF0000", fg: "#fff" },
  tiktok:    { label: "TikTok",    icon: FaTiktok as any,     placeholder: "https://tiktok.com/@usuario",       brand: "#000000", fg: "#fff" },
  github:    { label: "GitHub",    icon: FaGithub as any,     placeholder: "https://github.com/usuario",        brand: "#181717", fg: "#fff" },
  discord:   { label: "Discord",   icon: FaDiscord as any,    placeholder: "https://discord.gg/xxxx",           brand: "#5865F2", fg: "#fff" },
  reddit:    { label: "Reddit",    icon: FaReddit as any,     placeholder: "https://reddit.com/r/xxxx",         brand: "#FF4500", fg: "#fff" },
  twitch:    { label: "Twitch",    icon: FaTwitch as any,     placeholder: "https://twitch.tv/usuario",         brand: "#9146FF", fg: "#fff" },
  linkedin:  { label: "LinkedIn",  icon: FaLinkedin as any,   placeholder: "https://linkedin.com/in/usuario",   brand: "#0A66C2", fg: "#fff" },
  telegram:  { label: "Telegram",  icon: FaTelegram as any,   placeholder: "https://t.me/usuario",              brand: "#26A5E4", fg: "#fff" },
  patreon:   { label: "Patreon",   icon: FaPatreon as any,    placeholder: "https://patreon.com/usuario",       brand: "#FF424D", fg: "#fff" },
  metube:    { label: "MeTube",    icon: FaLink as any,       placeholder: "/c/usuario o /watch/id",            brand: "#FFFFFF", fg: "#000" },
  other:     { label: "Otro",      icon: FaLink as any,       placeholder: "https://...",                       brand: "#6B7280", fg: "#fff" },
};

export const PLATFORM_ORDER: Platform[] = [
  "website", "twitter", "instagram", "youtube", "tiktok", "github",
  "discord", "reddit", "twitch", "linkedin", "telegram", "patreon",
  "metube", "other",
];

const HOST_RULES: { match: RegExp; platform: Platform }[] = [
  { match: /(?:^|\.)x\.com$|(?:^|\.)twitter\.com$/i, platform: "twitter" },
  { match: /(?:^|\.)instagram\.com$/i, platform: "instagram" },
  { match: /(?:^|\.)youtube\.com$|(?:^|\.)youtu\.be$/i, platform: "youtube" },
  { match: /(?:^|\.)tiktok\.com$/i, platform: "tiktok" },
  { match: /(?:^|\.)github\.com$/i, platform: "github" },
  { match: /(?:^|\.)discord\.(?:gg|com)$/i, platform: "discord" },
  { match: /(?:^|\.)reddit\.com$/i, platform: "reddit" },
  { match: /(?:^|\.)twitch\.tv$/i, platform: "twitch" },
  { match: /(?:^|\.)linkedin\.com$/i, platform: "linkedin" },
  { match: /(?:^|\.)t\.me$|(?:^|\.)telegram\.me$/i, platform: "telegram" },
  { match: /(?:^|\.)patreon\.com$/i, platform: "patreon" },
];

export const detectPlatform = (url: string): Platform => {
  if (url.startsWith("/")) return "metube";
  try {
    const u = new URL(url);
    for (const r of HOST_RULES) if (r.match.test(u.hostname)) return r.platform;
    if (/lovable\.app$/i.test(u.hostname)) return "metube";
    return "website";
  } catch { return "other"; }
};

export const normalizeLinkUrl = (url: string): string => {
  const v = url.trim();
  if (!v) return "";
  if (v.startsWith("/")) return v;
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
