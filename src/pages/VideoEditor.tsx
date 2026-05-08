import { useEffect, useMemo, useRef, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Film, Plus, Play, Pause, Trash2, Type, Smile, Download, Upload,
  Volume2, Scissors, GripVertical, Camera, Square, Circle, Monitor,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// ---------- Types ----------
interface Clip {
  id: string;
  name: string;
  url: string;        // object URL
  file: File;
  duration: number;   // seconds, original
  trimStart: number;  // seconds within source
  trimEnd: number;    // seconds within source
  volume: number;     // 0..1
}
interface OverlayBase {
  id: string;
  tStart: number; // timeline seconds
  tEnd: number;
  x: number;      // 0..1 normalized
  y: number;      // 0..1
}
interface TextOverlay extends OverlayBase {
  kind: "text";
  text: string;
  size: number;   // px (relative to 1080-wide canvas)
  color: string;
}
interface StickerOverlay extends OverlayBase {
  kind: "sticker";
  emoji: string;
  size: number;
}
type Overlay = TextOverlay | StickerOverlay;

const STICKERS = ["🔥","✨","💯","😂","😍","👍","🎉","❤️","⭐","🚀","💀","🤯","🥳","👀"];
const FONT_COLORS = ["#ffffff","#000000","#ff3b30","#ffcc00","#34c759","#0a84ff","#bf5af2","#ff375f"];

const newId = () => Math.random().toString(36).slice(2, 10);

// ---------- Editor ----------
const VideoEditorInner = () => {
  const [clips, setClips] = useState<Clip[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(null);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [playing, setPlaying] = useState(false);
  const [tNow, setTNow] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [recording, setRecording] = useState<null | "camera" | "screen">(null);
  const [recordTime, setRecordTime] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const recordTimerRef = useRef<number | null>(null);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => { document.title = "Editor de vídeo — MeTube"; }, []);

  // Total timeline duration
  const totalDuration = useMemo(
    () => clips.reduce((sum, c) => sum + Math.max(0, c.trimEnd - c.trimStart), 0),
    [clips]
  );

  // Resolve which clip is active at a given timeline time
  const resolveAtTime = (t: number) => {
    let acc = 0;
    for (const c of clips) {
      const dur = Math.max(0, c.trimEnd - c.trimStart);
      if (t < acc + dur) {
        return { clip: c, sourceTime: c.trimStart + (t - acc), localStart: acc };
      }
      acc += dur;
    }
    return null;
  };

  // ---------- Add clips ----------
  const addFiles = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      if (!file.type.startsWith("video/")) { toast.error(`${file.name}: no es vídeo`); continue; }
      const url = URL.createObjectURL(file);
      const dur = await new Promise<number>((res, rej) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.src = url;
        v.onloadedmetadata = () => res(v.duration || 0);
        v.onerror = () => rej(new Error("metadata"));
      }).catch(() => 0);
      const clip: Clip = {
        id: newId(),
        name: file.name,
        url,
        file,
        duration: dur,
        trimStart: 0,
        trimEnd: dur,
        volume: 1,
      };
      setClips((cs) => [...cs, clip]);
    }
  };

  // ---------- Playback engine (canvas + hidden video) ----------
  const drawFrame = (sourceVideo: HTMLVideoElement | null, localT: number) => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (sourceVideo && sourceVideo.readyState >= 2) {
      const vw = sourceVideo.videoWidth, vh = sourceVideo.videoHeight;
      if (vw && vh) {
        const r = Math.min(W / vw, H / vh);
        const dw = vw * r, dh = vh * r;
        ctx.drawImage(sourceVideo, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
    }
    // overlays
    for (const o of overlays) {
      if (localT < o.tStart || localT > o.tEnd) continue;
      const px = o.x * W, py = o.y * H;
      if (o.kind === "text") {
        ctx.font = `bold ${o.size * (W / 1080)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = Math.max(2, o.size * (W / 1080) * 0.08);
        ctx.strokeStyle = "#000";
        ctx.fillStyle = o.color;
        ctx.strokeText(o.text, px, py);
        ctx.fillText(o.text, px, py);
      } else {
        ctx.font = `${o.size * (W / 1080)}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.emoji, px, py);
      }
    }
  };

  // Sync hidden video to current time
  useEffect(() => {
    if (playing) return;
    const hv = hiddenVideoRef.current;
    const r = resolveAtTime(tNow);
    if (hv && r) {
      if (hv.src !== r.clip.url) hv.src = r.clip.url;
      const setAndDraw = () => { hv.currentTime = r.sourceTime; setTimeout(() => drawFrame(hv, tNow), 30); };
      if (hv.readyState >= 1) setAndDraw();
      else hv.onloadedmetadata = () => setAndDraw();
    } else {
      drawFrame(null, tNow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tNow, clips, overlays, aspect, playing]);

  const stop = () => {
    setPlaying(false);
    const hv = hiddenVideoRef.current;
    if (hv) hv.pause();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const play = () => {
    if (totalDuration <= 0) return;
    if (tNow >= totalDuration - 0.05) setTNow(0);
    setPlaying(true);
    startedAtRef.current = performance.now();
    startTimeRef.current = tNow;

    const tick = () => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const t = startTimeRef.current + elapsed;
      if (t >= totalDuration) { setTNow(totalDuration); stop(); return; }
      const r = resolveAtTime(t);
      const hv = hiddenVideoRef.current;
      if (hv && r) {
        if (hv.src !== r.clip.url) {
          hv.src = r.clip.url;
          hv.onloadedmetadata = () => { hv.currentTime = r.sourceTime; hv.volume = r.clip.volume; hv.play().catch(() => {}); };
        } else {
          hv.volume = r.clip.volume;
          if (Math.abs(hv.currentTime - r.sourceTime) > 0.4) hv.currentTime = r.sourceTime;
          if (hv.paused) hv.play().catch(() => {});
        }
        drawFrame(hv, t);
      } else {
        drawFrame(null, t);
      }
      setTNow(t);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

  // ---------- Clip ops ----------
  const updateClip = (id: string, patch: Partial<Clip>) => setClips((cs) => cs.map(c => c.id === id ? { ...c, ...patch } : c));
  const removeClip = (id: string) => {
    setClips((cs) => {
      const c = cs.find(x => x.id === id);
      if (c) URL.revokeObjectURL(c.url);
      return cs.filter(x => x.id !== id);
    });
    if (selectedClip === id) setSelectedClip(null);
  };
  const moveClip = (id: string, dir: -1 | 1) => {
    setClips((cs) => {
      const i = cs.findIndex(c => c.id === id);
      if (i < 0) return cs;
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = cs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const splitAtPlayhead = () => {
    const r = resolveAtTime(tNow);
    if (!r) return;
    const { clip, sourceTime } = r;
    if (sourceTime <= clip.trimStart + 0.05 || sourceTime >= clip.trimEnd - 0.05) return;
    const a: Clip = { ...clip, id: newId(), trimEnd: sourceTime };
    const b: Clip = { ...clip, id: newId(), trimStart: sourceTime };
    setClips((cs) => cs.flatMap(c => c.id === clip.id ? [a, b] : [c]));
    toast.success("Clip dividido");
  };

  // ---------- Overlay ops ----------
  const addText = () => {
    const o: TextOverlay = {
      id: newId(), kind: "text", text: "Texto", size: 64, color: "#ffffff",
      tStart: tNow, tEnd: Math.min(totalDuration, tNow + 3),
      x: 0.5, y: 0.85,
    };
    setOverlays(os => [...os, o]); setSelectedOverlay(o.id);
  };
  const addSticker = (emoji: string) => {
    const o: StickerOverlay = {
      id: newId(), kind: "sticker", emoji, size: 120,
      tStart: tNow, tEnd: Math.min(totalDuration, tNow + 3),
      x: 0.5, y: 0.5,
    };
    setOverlays(os => [...os, o]); setSelectedOverlay(o.id);
  };
  const updateOverlay = (id: string, patch: Partial<Overlay>) => setOverlays(os => os.map(o => o.id === id ? { ...o, ...patch } as Overlay : o));
  const removeOverlay = (id: string) => { setOverlays(os => os.filter(o => o.id !== id)); if (selectedOverlay === id) setSelectedOverlay(null); };

  // Drag overlays on canvas
  const draggingRef = useRef<string | null>(null);
  const onCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = previewRef.current; if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    // hit test top-most
    for (let i = overlays.length - 1; i >= 0; i--) {
      const o = overlays[i];
      if (tNow < o.tStart || tNow > o.tEnd) continue;
      const dx = Math.abs(o.x - px), dy = Math.abs(o.y - py);
      if (dx < 0.15 && dy < 0.12) {
        draggingRef.current = o.id;
        setSelectedOverlay(o.id);
        return;
      }
    }
  };
  const onCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const id = draggingRef.current; if (!id) return;
    const canvas = previewRef.current; if (!canvas) return;
    const r = canvas.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
    updateOverlay(id, { x: px, y: py });
  };
  const onCanvasMouseUp = () => { draggingRef.current = null; };

  // ---------- Recording (camera / screen) ----------
  const startRecording = async (mode: "camera" | "screen") => {
    if (recording) return;
    try {
      const stream = mode === "camera"
        ? await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
        : await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
      recordStreamRef.current = stream;
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find(m => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      recordChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(recordChunksRef.current, { type: mime });
        const file = new File([blob], `${mode}-${Date.now()}.webm`, { type: mime });
        await addFiles([file]);
        stream.getTracks().forEach(t => t.stop());
        recordStreamRef.current = null;
        if (recordTimerRef.current) { window.clearInterval(recordTimerRef.current); recordTimerRef.current = null; }
        setRecordTime(0);
        setRecording(null);
        toast.success("Grabación añadida a la línea de tiempo");
      };
      stream.getVideoTracks()[0].addEventListener("ended", () => { try { mr.state !== "inactive" && mr.stop(); } catch {} });
      mr.start(250);
      recorderRef.current = mr;
      setRecording(mode);
      const started = performance.now();
      recordTimerRef.current = window.setInterval(() => setRecordTime((performance.now() - started) / 1000), 200);
    } catch (e: any) {
      toast.error("No se pudo iniciar la grabación: " + (e?.message ?? "permiso denegado"));
    }
  };
  const stopRecording = () => {
    const mr = recorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
  };
  useEffect(() => () => {
    try { recorderRef.current?.state !== "inactive" && recorderRef.current?.stop(); } catch {}
    recordStreamRef.current?.getTracks().forEach(t => t.stop());
    if (recordTimerRef.current) window.clearInterval(recordTimerRef.current);
  }, []);

  // ---------- Export ----------
  const exportVideo = async () => {
    if (clips.length === 0) return toast.error("Añade al menos un clip");
    setExporting(true); setExportProgress(0);
    try {
      const { FFmpeg } = await import("@ffmpeg/ffmpeg");
      const { fetchFile } = await import("@ffmpeg/util");
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", (p: any) => setExportProgress(Math.min(0.99, p.progress || 0)));
      const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
      await ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });

      // Output dimensions
      const W = aspect === "16:9" ? 1280 : 720;
      const H = aspect === "16:9" ? 720 : 1280;

      // Trim each clip into segment.mp4 with consistent encoding & SAR
      const segs: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const c = clips[i];
        const inName = `in_${i}.mp4`;
        const outName = `seg_${i}.mp4`;
        await ffmpeg.writeFile(inName, await fetchFile(c.file));
        const dur = Math.max(0.1, c.trimEnd - c.trimStart);
        await ffmpeg.exec([
          "-ss", String(c.trimStart),
          "-i", inName,
          "-t", String(dur),
          "-vf", `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:black,setsar=1`,
          "-r", "30",
          "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-ar", "44100", "-ac", "2",
          "-af", `volume=${c.volume}`,
          outName,
        ]);
        await ffmpeg.deleteFile(inName);
        segs.push(outName);
      }

      // Concat
      const list = segs.map(s => `file '${s}'`).join("\n");
      await ffmpeg.writeFile("list.txt", new TextEncoder().encode(list));
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", "concat.mp4"]);

      // Bake overlays via drawtext / overlay (we approximate stickers as text with emoji font fallback)
      let final = "concat.mp4";
      if (overlays.length > 0) {
        const filters: string[] = [];
        overlays.forEach((o, idx) => {
          const enable = `between(t,${o.tStart.toFixed(3)},${o.tEnd.toFixed(3)})`;
          if (o.kind === "text") {
            const txt = o.text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
            filters.push(
              `drawtext=text='${txt}':fontcolor=${o.color}:fontsize=${Math.round(o.size * (W/1080))}:` +
              `borderw=3:bordercolor=black:x=(w-text_w)*${o.x.toFixed(3)}:y=(h-text_h)*${o.y.toFixed(3)}:enable='${enable}'`
            );
          } else {
            const txt = o.emoji.replace(/'/g, "\\'");
            filters.push(
              `drawtext=text='${txt}':fontsize=${Math.round(o.size * (W/1080))}:` +
              `x=(w-text_w)*${o.x.toFixed(3)}:y=(h-text_h)*${o.y.toFixed(3)}:enable='${enable}'`
            );
          }
          void idx;
        });
        const vf = filters.join(",");
        await ffmpeg.exec([
          "-i", "concat.mp4",
          "-vf", vf,
          "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
          "-c:a", "copy",
          "out.mp4",
        ]);
        final = "out.mp4";
      }

      const data = await ffmpeg.readFile(final);
      const blob = new Blob([data as any], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `metube-edit-${aspect === "9:16" ? "short" : "video"}-${Date.now()}.mp4`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      setExportProgress(1);
      toast.success("Exportación lista");
    } catch (e: any) {
      console.error(e);
      toast.error("Error exportando: " + (e?.message ?? "desconocido"));
    } finally {
      setExporting(false);
    }
  };

  // ---------- UI helpers ----------
  const canvasW = aspect === "16:9" ? 1280 : 720;
  const canvasH = aspect === "16:9" ? 720 : 1280;

  const selClip = clips.find(c => c.id === selectedClip);
  const selOv = overlays.find(o => o.id === selectedOverlay);

  return (
    <div className="max-w-[1400px] mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/studio"><ArrowLeft className="h-4 w-4 mr-1" />Studio</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5" />
            <h1 className="font-display text-2xl font-bold">Editor de vídeo</h1>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={aspect} onValueChange={(v: any) => setAspect(v)}>
            <SelectTrigger className="w-[160px] bg-surface-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">Vídeo 16:9</SelectItem>
              <SelectItem value="9:16">Short 9:16</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportVideo} disabled={exporting || clips.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? `Exportando ${Math.round(exportProgress * 100)}%` : "Exportar MP4"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-4">
        {/* Preview + timeline */}
        <div className="space-y-3 min-w-0">
          <Card className="glass-card p-3">
            <div className={`relative mx-auto bg-black rounded-lg overflow-hidden ${aspect === "9:16" ? "max-w-[360px]" : "w-full"}`}>
              <canvas
                ref={previewRef}
                width={canvasW}
                height={canvasH}
                onMouseDown={onCanvasMouseDown}
                onMouseMove={onCanvasMouseMove}
                onMouseUp={onCanvasMouseUp}
                onMouseLeave={onCanvasMouseUp}
                className="w-full h-auto block cursor-move"
                style={{ aspectRatio: aspect === "16:9" ? "16/9" : "9/16" }}
              />
              <video ref={hiddenVideoRef} muted={false} playsInline className="hidden" />
            </div>

            <div className="flex items-center gap-3 mt-3">
              <Button size="sm" variant="outline" onClick={() => playing ? stop() : play()} disabled={totalDuration === 0}>
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={splitAtPlayhead} disabled={totalDuration === 0} className="gap-1">
                <Scissors className="h-3.5 w-3.5" />Dividir
              </Button>
              <div className="text-xs font-mono text-muted-foreground tabular-nums">
                {tNow.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </div>
              <input
                type="range" min={0} max={Math.max(0.1, totalDuration)} step={0.05} value={tNow}
                onChange={(e) => { stop(); setTNow(parseFloat(e.target.value)); }}
                className="flex-1 accent-foreground"
              />
            </div>
          </Card>

          {/* Timeline strip — CapCut-style */}
          <Card className="glass-card p-3">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <p className="text-sm font-display font-semibold">Línea de tiempo</p>
              <div className="flex items-center gap-2 flex-wrap">
                {recording ? (
                  <Button size="sm" variant="destructive" onClick={stopRecording} className="gap-1">
                    <Square className="h-3.5 w-3.5" />Detener {recordTime.toFixed(1)}s
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => startRecording("camera")} className="gap-1">
                      <Camera className="h-3.5 w-3.5" />Cámara
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => startRecording("screen")} className="gap-1">
                      <Monitor className="h-3.5 w-3.5" />Pantalla
                    </Button>
                  </>
                )}
                <label>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <span className="cursor-pointer"><Plus className="h-3.5 w-3.5" />Añadir</span>
                  </Button>
                  <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                </label>
              </div>
            </div>
            {recording && (
              <div className="mb-2 flex items-center gap-2 text-xs text-destructive">
                <Circle className="h-3 w-3 fill-destructive animate-pulse" />
                Grabando {recording === "camera" ? "cámara" : "pantalla"}…
              </div>
            )}
            {clips.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                <Upload className="h-6 w-6 mx-auto mb-2" />
                Arrastra vídeos aquí, graba con la cámara o pulsa "Añadir".
              </div>
            ) : (
              <>
                {/* Visual proportional track */}
                <div className="relative bg-surface-2 rounded-lg p-2 overflow-x-auto">
                  <div className="relative h-16 flex gap-0.5 min-w-full" style={{ width: `${Math.max(100, totalDuration * 40)}px` }}>
                    {clips.map((c) => {
                      const dur = Math.max(0.1, c.trimEnd - c.trimStart);
                      const widthPct = (dur / Math.max(0.1, totalDuration)) * 100;
                      const isSel = selectedClip === c.id;
                      return (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedClip(c.id); setSelectedOverlay(null); }}
                          className={`relative h-full rounded overflow-hidden text-left transition-all border-2 ${isSel ? "border-foreground" : "border-transparent hover:border-border"}`}
                          style={{ width: `${widthPct}%`, minWidth: 40, background: "linear-gradient(135deg, hsl(var(--primary)/0.6), hsl(var(--primary)/0.3))" }}
                        >
                          <div className="absolute inset-0 px-1.5 py-1 flex flex-col justify-between">
                            <span className="text-[10px] text-foreground/90 font-medium truncate">{c.name}</span>
                            <span className="text-[10px] text-foreground/70 tabular-nums">{dur.toFixed(1)}s</span>
                          </div>
                        </button>
                      );
                    })}
                    {/* Playhead */}
                    {totalDuration > 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-destructive pointer-events-none"
                        style={{ left: `${(tNow / totalDuration) * 100}%` }}
                      >
                        <div className="absolute -top-1 -left-[5px] w-3 h-3 rounded-full bg-destructive" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Order/remove controls */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {clips.map((c) => (
                    <div key={c.id} className={`flex items-center gap-1 px-2 py-1 rounded border text-xs ${selectedClip === c.id ? "border-foreground bg-surface-2" : "border-border bg-surface-1"}`}>
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span className="truncate max-w-[120px]">{c.name}</span>
                      <button onClick={() => moveClip(c.id, -1)} className="px-1 hover:text-foreground text-muted-foreground">↑</button>
                      <button onClick={() => moveClip(c.id, 1)} className="px-1 hover:text-foreground text-muted-foreground">↓</button>
                      <button onClick={() => removeClip(c.id)} className="px-1 text-destructive"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Overlays list */}
          {overlays.length > 0 && (
            <Card className="glass-card p-3">
              <p className="text-sm font-display font-semibold mb-2">Capas</p>
              <div className="space-y-1.5">
                {overlays.map((o) => (
                  <div key={o.id}
                    onClick={() => { setSelectedOverlay(o.id); setSelectedClip(null); }}
                    className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer ${selectedOverlay === o.id ? "border-foreground bg-surface-2" : "border-border bg-surface-1"}`}>
                    <span className="shrink-0">{o.kind === "text" ? <Type className="h-4 w-4" /> : <span>{o.emoji}</span>}</span>
                    <span className="flex-1 truncate">{o.kind === "text" ? o.text : "Sticker"}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{o.tStart.toFixed(1)}–{o.tEnd.toFixed(1)}s</span>
                    <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); removeOverlay(o.id); }} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          <Card className="glass-card p-3">
            <p className="text-sm font-display font-semibold mb-2">Añadir capa</p>
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={addText} disabled={totalDuration === 0} className="gap-1"><Type className="h-3.5 w-3.5" />Texto</Button>
            </div>
            <p className="text-xs text-muted-foreground mb-1.5">Stickers</p>
            <div className="grid grid-cols-7 gap-1">
              {STICKERS.map(s => (
                <button key={s} onClick={() => addSticker(s)} disabled={totalDuration === 0}
                  className="h-9 rounded bg-surface-1 border border-border hover:bg-surface-2 disabled:opacity-50 text-lg">{s}</button>
              ))}
            </div>
          </Card>

          {selClip && (
            <Card className="glass-card p-3 space-y-3">
              <p className="text-sm font-display font-semibold">Clip: {selClip.name}</p>
              <div>
                <Label className="text-xs flex items-center gap-1"><Scissors className="h-3 w-3" />Recorte ({selClip.trimStart.toFixed(1)}s → {selClip.trimEnd.toFixed(1)}s)</Label>
                <Slider
                  min={0} max={selClip.duration} step={0.1}
                  value={[selClip.trimStart, selClip.trimEnd]}
                  onValueChange={([s, e]) => updateClip(selClip.id, { trimStart: Math.min(s, e - 0.1), trimEnd: Math.max(e, s + 0.1) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Volume2 className="h-3 w-3" />Volumen {Math.round(selClip.volume * 100)}%</Label>
                <Slider min={0} max={2} step={0.05} value={[selClip.volume]} onValueChange={([v]) => updateClip(selClip.id, { volume: v })} className="mt-2" />
              </div>
            </Card>
          )}

          {selOv && (
            <Card className="glass-card p-3 space-y-3">
              <p className="text-sm font-display font-semibold flex items-center gap-1">
                {selOv.kind === "text" ? <><Type className="h-4 w-4" />Texto</> : <><Smile className="h-4 w-4" />Sticker</>}
              </p>
              {selOv.kind === "text" && (
                <>
                  <div>
                    <Label className="text-xs">Contenido</Label>
                    <Input value={selOv.text} onChange={(e) => updateOverlay(selOv.id, { text: e.target.value })} className="bg-surface-1 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Color</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {FONT_COLORS.map(c => (
                        <button key={c} onClick={() => updateOverlay(selOv.id, { color: c })}
                          className={`h-7 w-7 rounded-full border-2 ${selOv.color === c ? "border-foreground" : "border-border"}`} style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <Label className="text-xs">Tamaño {selOv.size}px</Label>
                <Slider min={20} max={300} step={2} value={[selOv.size]} onValueChange={([v]) => updateOverlay(selOv.id, { size: v })} className="mt-2" />
              </div>
              <div>
                <Label className="text-xs">Tiempo en pantalla ({selOv.tStart.toFixed(1)}s → {selOv.tEnd.toFixed(1)}s)</Label>
                <Slider min={0} max={Math.max(0.1, totalDuration)} step={0.1}
                  value={[selOv.tStart, selOv.tEnd]}
                  onValueChange={([s, e]) => updateOverlay(selOv.id, { tStart: Math.min(s, e - 0.1), tEnd: Math.max(e, s + 0.1) })}
                  className="mt-2" />
              </div>
              <p className="text-xs text-muted-foreground">Arrastra en la previsualización para mover.</p>
            </Card>
          )}

          <Card className="glass-card p-3">
            <p className="text-xs text-muted-foreground">
              Editor experimental en navegador con FFmpeg.wasm. Para vídeos largos o muchas capas la exportación puede tardar.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

const VideoEditor = () => (
  <ProtectedRoute>
    <AppLayout><VideoEditorInner /></AppLayout>
  </ProtectedRoute>
);

export default VideoEditor;
