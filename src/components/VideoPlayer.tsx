import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  Settings, RotateCcw, RotateCw, PictureInPicture2, Loader2, Subtitles,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  url: string;
  source: "upload" | "external";
  poster?: string | null;
  vertical?: boolean;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return h ? `${h}:${mm}:${String(sec).padStart(2, "0")}` : `${mm}:${String(sec).padStart(2, "0")}`;
};

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const QUALITIES: { label: string; height?: number }[] = [
  { label: "Auto" }, { label: "1080p", height: 1080 }, { label: "720p", height: 720 },
  { label: "480p", height: 480 }, { label: "360p", height: 360 },
];

export const VideoPlayer = ({ url, source, poster, vertical }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState("Auto");
  const [hovering, setHovering] = useState<number | null>(null);
  const [showCenterFx, setShowCenterFx] = useState<"play" | "pause" | null>(null);

  const v = videoRef.current;

  const flashFx = (kind: "play" | "pause") => {
    setShowCenterFx(kind);
    window.setTimeout(() => setShowCenterFx(null), 380);
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); flashFx("play"); }
    else { videoRef.current.pause(); flashFx("pause"); }
  }, []);

  const seekBy = (delta: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, Math.max(0, videoRef.current.currentTime + delta));
  };

  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    videoRef.current.currentTime = ratio * duration;
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
    if (!videoRef.current.muted && videoRef.current.volume === 0) {
      videoRef.current.volume = 0.5; setVolume(0.5);
    }
  };

  const setVol = (val: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = val;
    videoRef.current.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const togglePip = async () => {
    const el = videoRef.current as any;
    if (!el) return;
    try {
      if (document.pictureInPictureElement) await (document as any).exitPictureInPicture?.();
      else await el.requestPictureInPicture?.();
    } catch {/* no-op */}
  };

  const setPlaybackRate = (s: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = s; setSpeed(s);
  };

  // Hide controls after inactivity
  const bumpControls = () => {
    setShowControls(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 2400);
  };

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      const target = e.target as HTMLElement;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;
      const inside = containerRef.current.contains(document.activeElement) || document.fullscreenElement === containerRef.current;
      if (!inside && document.activeElement !== document.body) return;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "arrowright": seekBy(5); break;
        case "arrowleft": seekBy(-5); break;
        case "j": seekBy(-10); break;
        case "l": seekBy(10); break;
        case "m": toggleMute(); break;
        case "f": toggleFullscreen(); break;
        case "arrowup": setVol(Math.min(1, volume + 0.05)); break;
        case "arrowdown": setVol(Math.max(0, volume - 0.05)); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [togglePlay, volume, duration]);

  const aspect = vertical ? "aspect-[9/16]" : "aspect-video";
  const VolIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const progressPct = duration ? (current / duration) * 100 : 0;
  const bufferPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className={`relative w-full ${aspect} ${vertical ? "max-h-[80vh] mx-auto" : ""} rounded-xl overflow-hidden border border-border bg-black group/player select-none outline-none`}
      onMouseMove={bumpControls}
      onMouseLeave={() => { if (v && !v.paused) setShowControls(false); }}
      onClick={(e) => { if ((e.target as HTMLElement).dataset?.role !== "control") togglePlay(); }}
      onDoubleClick={toggleFullscreen}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        src={url}
        poster={poster ?? undefined}
        playsInline
        preload="metadata"
        crossOrigin={source === "external" ? "anonymous" : undefined}
        className="h-full w-full object-contain bg-black"
        onPlay={() => { setPlaying(true); bumpControls(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onTimeUpdate={() => {
          const el = videoRef.current; if (!el) return;
          setCurrent(el.currentTime);
          try {
            const tr = el.buffered;
            if (tr.length) setBuffered(tr.end(tr.length - 1));
          } catch { /* */ }
        }}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
        onVolumeChange={() => { const el = videoRef.current; if (el) { setVolume(el.volume); setMuted(el.muted); } }}
        onEnded={() => setPlaying(false)}
      />

      {/* Buffer spinner */}
      {waiting && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-12 w-12 animate-spin text-white/90" />
        </div>
      )}

      {/* Center play/pause feedback */}
      {showCenterFx && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-20 w-20 rounded-full bg-black/60 backdrop-blur flex items-center justify-center animate-[ping_0.4s_ease-out]">
            {showCenterFx === "play" ? <Play className="h-9 w-9 text-white fill-white" /> : <Pause className="h-9 w-9 text-white fill-white" />}
          </div>
        </div>
      )}

      {/* Big play overlay if paused & at start */}
      {!playing && current === 0 && (
        <button
          data-role="control"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition"
          aria-label="Reproducir"
        >
          <span className="h-20 w-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-105 transition">
            <Play className="h-9 w-9 fill-current ml-1" />
          </span>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute inset-x-0 bottom-0 px-3 sm:px-4 pb-2 pt-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-200 ${showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        data-role="control"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div
          className="group/progress relative h-1.5 hover:h-2 transition-all rounded-full bg-white/20 cursor-pointer mb-2"
          onClick={onSeek}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
            setHovering(ratio * duration);
          }}
          onMouseLeave={() => setHovering(null)}
        >
          <div className="absolute inset-y-0 left-0 bg-white/30 rounded-full" style={{ width: `${bufferPct}%` }} />
          <div className="absolute inset-y-0 left-0 bg-white rounded-full" style={{ width: `${progressPct}%` }} />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-white opacity-0 group-hover/progress:opacity-100 transition"
            style={{ left: `${progressPct}%` }}
          />
          {hovering !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 bg-black/90 text-white text-[11px] font-mono px-1.5 py-0.5 rounded pointer-events-none"
              style={{ left: `${(hovering / Math.max(1, duration)) * 100}%` }}
            >
              {fmt(hovering)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-white">
          <button data-role="control" onClick={togglePlay} className="p-1.5 hover:bg-white/10 rounded-full transition" aria-label={playing ? "Pausar" : "Reproducir"}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </button>
          <button data-role="control" onClick={() => seekBy(-10)} className="p-1.5 hover:bg-white/10 rounded-full transition hidden sm:inline-flex" aria-label="Atrás 10s">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button data-role="control" onClick={() => seekBy(10)} className="p-1.5 hover:bg-white/10 rounded-full transition hidden sm:inline-flex" aria-label="Adelante 10s">
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="group/vol flex items-center gap-1">
            <button data-role="control" onClick={toggleMute} className="p-1.5 hover:bg-white/10 rounded-full transition" aria-label={muted ? "Desmutear" : "Mutear"}>
              <VolIcon className="h-5 w-5" />
            </button>
            <input
              type="range" min={0} max={1} step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(parseFloat(e.target.value))}
              className="w-0 group-hover/vol:w-20 focus:w-20 h-1 transition-all duration-300 accent-white cursor-pointer"
              aria-label="Volumen"
              data-role="control"
            />
          </div>

          <div className="text-xs font-mono tabular-nums ml-1">
            {fmt(current)} <span className="text-white/60">/ {fmt(duration)}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button data-role="control" className="p-1.5 hover:bg-white/10 rounded-full transition" aria-label="Ajustes">
                  <Settings className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/95 text-white border-white/20 backdrop-blur w-56">
                <DropdownMenuLabel className="text-white/70 text-xs">Velocidad</DropdownMenuLabel>
                <div className="flex flex-wrap gap-1 px-2 py-1">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPlaybackRate(s)}
                      className={`text-xs px-2 py-1 rounded ${speed === s ? "bg-white text-black" : "hover:bg-white/10"}`}
                    >
                      {s === 1 ? "Normal" : `${s}x`}
                    </button>
                  ))}
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuLabel className="text-white/70 text-xs">Calidad</DropdownMenuLabel>
                {QUALITIES.map((q) => (
                  <DropdownMenuItem
                    key={q.label}
                    onSelect={() => setQuality(q.label)}
                    className={`text-sm cursor-pointer focus:bg-white/10 ${quality === q.label ? "font-semibold" : ""}`}
                  >
                    {q.label}{quality === q.label ? " ✓" : ""}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="text-sm focus:bg-white/10 cursor-not-allowed opacity-50">
                  <Subtitles className="h-4 w-4 mr-2" />Subtítulos (no disponibles)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button data-role="control" onClick={togglePip} className="p-1.5 hover:bg-white/10 rounded-full transition hidden sm:inline-flex" aria-label="PiP">
              <PictureInPicture2 className="h-5 w-5" />
            </button>
            <button data-role="control" onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-full transition" aria-label="Pantalla completa">
              {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
