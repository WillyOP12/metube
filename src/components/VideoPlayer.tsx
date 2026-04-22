interface Props {
  url: string;
  source?: "upload" | "external";
  poster?: string | null;
  vertical?: boolean;
}

export const VideoPlayer = ({ url, poster, vertical }: Props) => {
  const aspect = vertical ? "aspect-[9/16]" : "aspect-video";
  return (
    <div className={`w-full ${aspect} rounded-xl overflow-hidden border border-border bg-black`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={url}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        className="h-full w-full object-contain bg-black"
      />
    </div>
  );
};
