// Genera una miniatura JPEG a partir de un frame aleatorio del archivo de vídeo.
// Devuelve un File listo para subir, o null si no se pudo extraer.
export async function generateThumbnailFromVideo(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
      // Frame aleatorio entre 10% y 80% para evitar negros del inicio/final
      const target = dur * (0.1 + Math.random() * 0.7);
      const onSeek = () => {
        try {
          const w = video.videoWidth || 1280;
          const h = video.videoHeight || 720;
          const maxW = 1280;
          const scale = Math.min(1, maxW / w);
          const cw = Math.round(w * scale);
          const ch = Math.round(h * scale);
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) { cleanup(); return resolve(null); }
          ctx.drawImage(video, 0, 0, cw, ch);
          canvas.toBlob((blob) => {
            cleanup();
            if (!blob) return resolve(null);
            resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
          }, "image/jpeg", 0.85);
        } catch {
          cleanup();
          resolve(null);
        }
      };
      video.onseeked = onSeek;
      try { video.currentTime = target; } catch { cleanup(); resolve(null); }
    };
    video.onerror = () => { cleanup(); resolve(null); };
  });
}

// Para YouTube: devuelve la mejor miniatura disponible.
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
