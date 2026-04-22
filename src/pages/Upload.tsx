import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Upload as UploadIcon, Image as ImageIcon, Film, Hash, Link as LinkIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateThumbnailFromVideo, generateThumbnailFrames } from "@/lib/thumbnail";
import { MentionTextarea } from "@/components/MentionTextarea";
import { LinksEditor } from "@/components/LinksEditor";
import { ImageCropper } from "@/components/ImageCropper";
import { recordMentions } from "@/lib/mentions";
import { extractHashtags } from "@/components/RichText";
import type { RichLink } from "@/lib/links";

const Inner = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [isShort, setIsShort] = useState(false);
  const [links, setLinks] = useState<RichLink[]>([]);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [thumbCandidates, setThumbCandidates] = useState<File[]>([]);
  const [generatingThumbs, setGeneratingThumbs] = useState(false);

  const [pendingThumb, setPendingThumb] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { document.title = "Subir vídeo — MeTube"; }, []);

  const enableChannel = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ is_channel: true }).eq("id", user.id);
    if (error) toast.error("No se pudo activar el modo canal");
    else { toast.success("Modo canal activado"); refresh(); }
  };

  const onVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 500 * 1024 * 1024) { toast.error("Máx 500 MB por vídeo"); return; }
    setVideoFile(f);
    setThumbCandidates([]);
    if (f) {
      setGeneratingThumbs(true);
      try {
        const cands = await generateThumbnailFrames(f, 3);
        setThumbCandidates(cands);
      } finally { setGeneratingThumbs(false); }
    }
  };

  const regenerateFrames = async () => {
    if (!videoFile) return;
    setGeneratingThumbs(true);
    try {
      const cands = await generateThumbnailFrames(videoFile, 3);
      setThumbCandidates(cands);
    } finally { setGeneratingThumbs(false); }
  };

  const setThumbFromCandidate = (f: File) => {
    setThumbFile(f);
    setThumbPreview(URL.createObjectURL(f));
  };

  const onThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) return;
    setPendingThumb(f);
    setCropOpen(true);
    if (e.target) e.target.value = "";
  };

  const onCropConfirmed = (cropped: File) => {
    setThumbFile(cropped);
    setThumbPreview(URL.createObjectURL(cropped));
  };

  const uploadToBucket = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600", upsert: false, contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }
    if (!profile?.is_channel) { toast.error("Activa el modo canal antes de subir vídeos"); return; }
    if (!videoFile) { toast.error("Selecciona un archivo de vídeo"); return; }

    setUploading(true);
    setProgress(5);
    try {
      setProgress(20);
      const video_url = await uploadToBucket("videos", videoFile);
      setProgress(70);

      let thumbnail_url: string | null = null;
      if (thumbFile) {
        thumbnail_url = await uploadToBucket("thumbnails", thumbFile);
      } else {
        // Auto-elegir el primer candidato si no eligió
        const auto = thumbCandidates[0] ?? await generateThumbnailFromVideo(videoFile);
        if (auto) thumbnail_url = await uploadToBucket("thumbnails", auto);
      }
      setProgress(85);

      const inputTags = hashtagsInput
        .split(/[\s,]+/).map((t) => t.replace(/^#/, "").trim().toLowerCase())
        .filter(Boolean);
      const descTags = extractHashtags(description);
      const hashtags = Array.from(new Set([...inputTags, ...descTags])).slice(0, 15);

      const { data, error } = await supabase.from("videos").insert({
        channel_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        video_url,
        thumbnail_url,
        source: "upload",
        is_short: isShort,
        hashtags,
        links: links as any,
      }).select("id").single();

      if (error) throw error;
      setProgress(100);

      // Menciones en descripción
      if (description.trim()) {
        await recordMentions({
          text: description, sourceType: "video", sourceId: data.id, sourceUserId: user.id,
        });
      }

      toast.success("Vídeo publicado");
      navigate(`/${isShort ? "shorts" : "watch"}/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error subiendo el vídeo";
      toast.error(msg);
    } finally { setUploading(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Subir vídeo</h1>
        <p className="text-muted-foreground text-sm mt-1">Solo se aceptan archivos de vídeo (MP4, WebM, MOV…). Se reproducen siempre en el player de MeTube.</p>
      </div>

      {!profile?.is_channel && (
        <Card className="glass-card p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Activa tu canal</p>
            <p className="text-sm text-muted-foreground">Necesitas un canal para publicar vídeos.</p>
          </div>
          <Button onClick={enableChannel}>Activar canal</Button>
        </Card>
      )}

      <Card className="glass-card p-6 space-y-5">
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="w-full border border-dashed border-border rounded-xl p-10 text-center hover:bg-surface-2 transition-colors"
        >
          <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="font-medium">{videoFile ? videoFile.name : "Haz clic para seleccionar un vídeo"}</p>
          <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM · máx 500 MB</p>
        </button>
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={onVideoChange} />

        <div className="grid sm:grid-cols-[1fr_240px] gap-5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Un título irresistible" className="bg-surface-1 border-border mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/120</p>
            </div>
            <div>
              <Label htmlFor="desc">Descripción</Label>
              <MentionTextarea id="desc" value={description} onChange={(v) => setDescription(v.slice(0, 2000))}
                placeholder="Describe el vídeo… puedes mencionar @usuarios, usar #hashtags y pegar enlaces."
                className="bg-surface-1 border-border mt-1.5 min-h-28" />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/2000</p>
            </div>
            <div>
              <Label htmlFor="tags" className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />Hashtags</Label>
              <Input id="tags" value={hashtagsInput} onChange={(e) => setHashtagsInput(e.target.value)}
                placeholder="gaming, tutorial, español"
                className="bg-surface-1 border-border mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Separados por coma o espacio. Se combinan con los #hashtags de la descripción.</p>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5" />Enlaces</Label>
              <div className="mt-1.5"><LinksEditor value={links} onChange={setLinks} /></div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <Label className="cursor-pointer">Es un Short</Label>
                <p className="text-xs text-muted-foreground">Vídeos verticales cortos.</p>
              </div>
              <Switch checked={isShort} onCheckedChange={setIsShort} />
            </div>
          </div>

          <div>
            <Label>Miniatura</Label>
            <button type="button" onClick={() => thumbInputRef.current?.click()}
              className="mt-1.5 w-full aspect-video rounded-lg border border-dashed border-border overflow-hidden bg-surface-2 flex items-center justify-center hover:border-foreground/40 transition-colors"
            >
              {thumbPreview ? (
                <img src={thumbPreview} alt="Miniatura" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-xs">Subir y recortar</p>
                </div>
              )}
            </button>
            <input ref={thumbInputRef} type="file" accept="image/*" className="hidden" onChange={onThumbChange} />

            {videoFile && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs text-muted-foreground">O elige un frame del vídeo</p>
                  <button type="button" onClick={regenerateFrames} disabled={generatingThumbs}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <RefreshCw className={`h-3 w-3 ${generatingThumbs ? "animate-spin" : ""}`} />Regenerar
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {generatingThumbs && thumbCandidates.length === 0
                    ? Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="aspect-video rounded bg-surface-2 animate-pulse" />
                    ))
                    : thumbCandidates.map((f, i) => {
                      const url = URL.createObjectURL(f);
                      return (
                        <button key={i} type="button" onClick={() => setThumbFromCandidate(f)}
                          className="aspect-video rounded overflow-hidden border border-border hover:border-foreground/60 transition">
                          <img src={url} alt={`frame ${i + 1}`} className="h-full w-full object-cover" />
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground text-center">Subiendo... {progress}%</p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={uploading || !profile?.is_channel}>
            {uploading ? "Publicando..." : "Publicar vídeo"}
          </Button>
        </div>
      </Card>

      <ImageCropper
        file={pendingThumb}
        aspect={16 / 9}
        outputMaxWidth={1280}
        open={cropOpen}
        onOpenChange={setCropOpen}
        onConfirm={onCropConfirmed}
        title="Recortar miniatura"
      />
    </div>
  );
};

const Upload = () => (
  <ProtectedRoute>
    <AppLayout><Inner /></AppLayout>
  </ProtectedRoute>
);

export default Upload;
