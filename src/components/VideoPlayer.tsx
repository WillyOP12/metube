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

    // Cualquier otra URL externa: la intentamos reproducir como archivo de vídeo nativo.
    // El navegador detectará si la URL realmente es un stream/archivo reproducible.
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
