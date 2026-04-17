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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Upload as UploadIcon, Link2, Image as ImageIcon, Film } from "lucide-react";
import { toast } from "sonner";

const Inner = () => {
  const { user } = useAuth();
  const { profile, refresh } = useProfile();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"upload" | "external">("upload");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isShort, setIsShort] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Subir vídeo — MeTube";
  }, []);

  const enableChannel = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ is_channel: true }).eq("id", user.id);
    if (error) toast.error("No se pudo activar el modo canal");
    else { toast.success("Modo canal activado"); refresh(); }
  };

  const onVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 500 * 1024 * 1024) {
      toast.error("Máx 500 MB por vídeo");
      return;
    }
    setVideoFile(f);
  };

  const onThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setThumbFile(f);
    if (f) setThumbPreview(URL.createObjectURL(f));
    else setThumbPreview(null);
  };

  const uploadToBucket = async (bucket: string, file: File) => {
    const ext = file.name.split(".").pop() || "bin";
    const path = `${user!.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("El título es obligatorio"); return; }

    if (!profile?.is_channel) {
      toast.error("Activa el modo canal antes de subir vídeos");
      return;
    }

    setUploading(true);
    setProgress(5);

    try {
      let video_url = "";
      let source: "upload" | "external" = "upload";
      let thumbnail_url: string | null = null;

      if (tab === "upload") {
        if (!videoFile) { toast.error("Selecciona un archivo de vídeo"); setUploading(false); return; }
        setProgress(20);
        video_url = await uploadToBucket("videos", videoFile);
        source = "upload";
        setProgress(70);
      } else {
        if (!externalUrl.trim()) { toast.error("Pega una URL de vídeo"); setUploading(false); return; }
        try { new URL(externalUrl); } catch { toast.error("URL no válida"); setUploading(false); return; }
        video_url = externalUrl.trim();
        source = "external";
        setProgress(50);
      }

      if (thumbFile) {
        thumbnail_url = await uploadToBucket("thumbnails", thumbFile);
      }
      setProgress(85);

      const { data, error } = await supabase.from("videos").insert({
        channel_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        video_url,
        thumbnail_url,
        source,
        is_short: isShort,
      }).select("id").single();

      if (error) throw error;
      setProgress(100);
      toast.success("Vídeo publicado");
      navigate(`/watch/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error subiendo el vídeo";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Subir vídeo</h1>
        <p className="text-muted-foreground text-sm mt-1">Comparte un archivo propio o enlaza un vídeo externo (YouTube, Vimeo, mp4...).</p>
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
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="bg-surface-2">
            <TabsTrigger value="upload" className="gap-2"><UploadIcon className="h-4 w-4" />Subir archivo</TabsTrigger>
            <TabsTrigger value="external" className="gap-2"><Link2 className="h-4 w-4" />URL externa</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="w-full border border-dashed border-border rounded-xl p-10 text-center hover:bg-surface-2 transition-colors"
            >
              <Film className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">{videoFile ? videoFile.name : "Haz clic para seleccionar un vídeo"}</p>
              <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WebM · máx 500 MB</p>
            </button>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={onVideoChange}
            />
          </TabsContent>

          <TabsContent value="external" className="mt-4 space-y-2">
            <Label htmlFor="ext-url">URL del vídeo</Label>
            <Input
              id="ext-url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=... o https://.../video.mp4"
              className="bg-surface-1 border-border"
            />
            <p className="text-xs text-muted-foreground">Soporta YouTube, Vimeo y enlaces directos a archivos de vídeo.</p>
          </TabsContent>
        </Tabs>

        <div className="grid sm:grid-cols-[1fr_220px] gap-5">
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Un título irresistible"
                className="bg-surface-1 border-border mt-1.5"
              />
              <p className="text-xs text-muted-foreground mt-1">{title.length}/120</p>
            </div>
            <div>
              <Label htmlFor="desc">Descripción</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                placeholder="Cuenta de qué va el vídeo..."
                className="bg-surface-1 border-border mt-1.5 min-h-28"
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/2000</p>
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
            <button
              type="button"
              onClick={() => thumbInputRef.current?.click()}
              className="mt-1.5 w-full aspect-video rounded-lg border border-dashed border-border overflow-hidden bg-surface-2 flex items-center justify-center hover:border-foreground/40 transition-colors"
            >
              {thumbPreview ? (
                <img src={thumbPreview} alt="Miniatura" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImageIcon className="h-6 w-6 mx-auto mb-1" />
                  <p className="text-xs">Subir imagen</p>
                </div>
              )}
            </button>
            <input
              ref={thumbInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onThumbChange}
            />
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
    </div>
  );
};

const Upload = () => (
  <ProtectedRoute>
    <AppLayout><Inner /></AppLayout>
  </ProtectedRoute>
);

export default Upload;
