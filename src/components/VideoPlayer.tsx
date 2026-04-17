import { isYouTube, youtubeEmbed, isVimeo, vimeoEmbed } from "@/lib/format";

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
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
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
        className="h-full w-full object-contain bg-black"
      />
    </div>
  );
};
