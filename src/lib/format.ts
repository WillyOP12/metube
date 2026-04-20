export const formatViews = (n: number): string => {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(".0", "")} K`;
  return `${(n / 1_000_000).toFixed(1).replace(".0", "")} M`;
};

export const formatDuration = (seconds?: number | null): string => {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (x: number) => String(x).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

export const isYouTube = (url: string) => /(?:youtube\.com|youtu\.be|youtube-nocookie\.com)/i.test(url);

export const youtubeEmbed = (url: string): string | null => {
  try {
    const u = new URL(url);
    let id: string | null = null;

    if (u.hostname.includes("youtu.be")) {
      id = u.pathname.slice(1).split("/")[0] || null;
    } else if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/embed/")) {
        id = u.pathname.split("/")[2] || null;
      } else if (u.pathname.startsWith("/shorts/")) {
        id = u.pathname.split("/")[2] || null;
      } else if (u.pathname.startsWith("/live/")) {
        id = u.pathname.split("/")[2] || null;
      } else if (u.pathname.startsWith("/watch")) {
        id = u.searchParams.get("v");
      } else if (u.pathname.startsWith("/v/")) {
        id = u.pathname.split("/")[2] || null;
      }
    }

    if (!id) return null;

    // Soporta timestamps (?t=120 o ?start=120)
    const t = u.searchParams.get("t") || u.searchParams.get("start");
    let startSec: number | null = null;
    if (t) {
      const m = t.match(/^(\d+)([hms]?)$/i);
      if (m) {
        const n = parseInt(m[1], 10);
        startSec = m[2].toLowerCase() === "h" ? n * 3600 : m[2].toLowerCase() === "m" ? n * 60 : n;
      }
    }

    const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
    if (startSec) params.set("start", String(startSec));
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  } catch { /* noop */ }
  return null;
};

export const isVimeo = (url: string) => /vimeo\.com/i.test(url);

export const vimeoEmbed = (url: string): string | null => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;
    // /video/123456789 o /123456789 o /123456789/abcdef (hash privado)
    let id: string | null = null;
    let hash: string | null = null;
    if (parts[0] === "video" && parts[1]) {
      id = parts[1];
      hash = parts[2] ?? null;
    } else if (/^\d+$/.test(parts[0])) {
      id = parts[0];
      hash = parts[1] ?? null;
    }
    if (!id) return null;
    return hash
      ? `https://player.vimeo.com/video/${id}?h=${hash}`
      : `https://player.vimeo.com/video/${id}`;
  } catch { /* noop */ }
  return null;
};

const VIDEO_FILE_EXT = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/i;
export const isDirectVideoUrl = (url: string) => VIDEO_FILE_EXT.test(url);
