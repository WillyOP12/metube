// Genera 1 o varias miniaturas a partir de frames de un archivo de vídeo.
export async function generateThumbnailFromVideo(file: File): Promise<File | null> {
  const list = await generateThumbnailFrames(file, 1);
  return list[0] ?? null;
}

export async function generateThumbnailFrames(file: File, count = 3): Promise<File[]> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    const out: File[] = [];
    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = async () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      const targets: number[] = [];
      for (let i = 0; i < count; i++) {
        // Distribuye uniformemente entre 10% y 80% + jitter para evitar negros
        const base = 0.1 + (0.7 * (i + 0.5)) / count;
        const jitter = (Math.random() - 0.5) * (0.7 / count);
        targets.push(dur * Math.max(0.05, Math.min(0.95, base + jitter)));
      }

      const captureAt = (t: number) => new Promise<File | null>((res) => {
        const onSeek = () => {
          video.removeEventListener("seeked", onSeek);
          try {
            const w = video.videoWidth || 1280;
            const h = video.videoHeight || 720;
            const maxW = 1280;
            const scale = Math.min(1, maxW / w);
            const cw = Math.round(w * scale);
            const ch = Math.round(h * scale);
            const canvas = document.createElement("canvas");
            canvas.width = cw; canvas.height = ch;
            const ctx = canvas.getContext("2d");
            if (!ctx) return res(null);
            ctx.drawImage(video, 0, 0, cw, ch);
            canvas.toBlob((blob) => {
              if (!blob) return res(null);
              res(new File([blob], `thumb-${Math.round(t * 1000)}.jpg`, { type: "image/jpeg" }));
            }, "image/jpeg", 0.85);
          } catch { res(null); }
        };
        video.addEventListener("seeked", onSeek);
        try { video.currentTime = t; } catch { res(null); }
      });

      for (const t of targets) {
        const f = await captureAt(t);
        if (f) out.push(f);
      }
      cleanup();
      resolve(out);
    };
    video.onerror = () => { cleanup(); resolve(out); };
  });
}

// Para YouTube: devuelve la mejor miniatura disponible (deprecated, embeds quitados).
export function youtubeThumbnail(url: string): string | null {
  try {
    const u = new URL(url);
    let id: string | null = null;
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1).split("/")[0] || null;
    else if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      if (u.pathname.startsWith("/watch")) id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/") || u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/live/") || u.pathname.startsWith("/v/")) {
        id = u.pathname.split("/")[2] || null;
      }
    }
    if (!id) return null;
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  } catch { return null; }
}
