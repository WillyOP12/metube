import { isYouTube, youtubeEmbed, isVimeo, vimeoEmbed, isDirectVideoUrl } from "@/lib/format";
import { ExternalLink } from "lucide-react";

interface Props {
  url: string;
  source: "upload" | "external";
  poster?: string | null;
  vertical?: boolean;
}

export const VideoPlayer = ({ url, source, poster, vertical }: Props) => {
  const aspect = vertical ? "aspect-[9/16]" : "aspect-video";

  if (source === "external") {
    const yt = isYouTube(url) ? youtubeEmbed(url) : null;
    const vm = !yt && isVimeo(url) ? vimeoEmbed(url) : null;
    const embed = yt || vm;

    if (embed) {
      return (
        <div className={`w-full ${aspect} rounded-xl overflow-hidden border border-border bg-black`}>
          <iframe
            src={embed}
            title="Reproductor"
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        </div>
      );
    }

    // URL externa que no es YouTube/Vimeo: si parece un archivo de vídeo, reproducirlo; si no, mostrar fallback con enlace
    if (!isDirectVideoUrl(url)) {
      return (
        <div className={`w-full ${aspect} rounded-xl overflow-hidden border border-border bg-black flex flex-col items-center justify-center text-center p-6 gap-3`}>
          <p className="text-sm text-muted-foreground max-w-md">
            Este vídeo está alojado en un sitio externo que no se puede embeber. Ábrelo en una nueva pestaña.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition"
          >
            <ExternalLink className="h-4 w-4" />Abrir vídeo
          </a>
        </div>
      );
    }
  }

  return (
    <div className={`w-full ${aspect} rounded-xl overflow-hidden border border-border bg-black`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={url}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        crossOrigin={source === "external" ? "anonymous" : undefined}
        className="h-full w-full object-contain bg-black"
      />
    </div>
  );
};
