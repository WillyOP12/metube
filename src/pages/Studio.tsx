import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ChannelHeader } from "@/components/ChannelHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useProfile, type SocialLinks } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/upload";
import { toast } from "sonner";
import { ImagePlus, Tv, Palette, MapPin, Globe, Twitter, Instagram, Youtube, Github, Link as LinkIcon, Eye } from "lucide-react";

const ACCENT_PRESETS = [
  "#ffffff", "#ff4d4d", "#ff7a00", "#ffd60a", "#34c759",
  "#5ac8fa", "#0a84ff", "#bf5af2", "#ff375f", "#8e8e93",
];

const StudioInner = () => {
  const { user } = useAuth();
  const { profile, loading, refresh } = useProfile();

  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string>("");
  const [location, setLocation] = useState("");
  const [language, setLanguage] = useState("");
  const [bio, setBio] = useState("");
  const [channelName, setChannelName] = useState("");
  const [social, setSocial] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    document.title = "Studio — MeTube";
    if (profile) {
      setBannerUrl(profile.banner_url);
      setAccentColor(profile.accent_color ?? "");
      setLocation(profile.location ?? "");
      setLanguage(profile.language ?? "");
      setBio(profile.bio ?? "");
      setChannelName(profile.channel_name ?? "");
      setSocial(profile.social_links || {});
    }
  }, [profile]);

  const updateSocial = (key: keyof SocialLinks, value: string) =>
    setSocial((prev) => ({ ...prev, [key]: value }));

  const handleBanner = async (file: File) => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) return toast.error("Máx 8MB");
    if (!file.type.startsWith("image/")) return toast.error("Solo imágenes");
    setUploadingBanner(true);
    try {
      const url = await uploadToBucket("banners", user.id, file, "banner");
      const { error } = await supabase.from("profiles").update({ banner_url: url }).eq("id", user.id);
      if (error) throw error;
      setBannerUrl(url);
      toast.success("Banner actualizado");
      refresh();
    } catch (e) {
      toast.error("No se pudo subir el banner. Inténtalo de nuevo.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const removeBanner = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ banner_url: null }).eq("id", user.id);
    if (error) return toast.error("Error eliminando");
    setBannerUrl(null);
    refresh();
  };

  const save = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const cleanSocial: SocialLinks = {};
    (Object.keys(social) as (keyof SocialLinks)[]).forEach((k) => {
      const v = (social[k] || "").trim();
      if (v) cleanSocial[k] = v;
    });
    const { error } = await supabase.from("profiles").update({
      accent_color: accentColor || null,
      location: location.trim() || null,
      language: language.trim() || null,
      bio: bio.trim() || null,
      channel_name: channelName.trim() || null,
      social_links: cleanSocial as any,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error("No se pudo guardar");
    toast.success("Canal actualizado");
    refresh();
  };

  if (loading || !profile) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
  }

  if (!profile.is_channel) {
    return (
      <Card className="glass-card p-12 text-center max-w-md mx-auto">
        <Tv className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold mb-1">Activa tu canal primero</h2>
        <p className="text-muted-foreground mb-4">Ve a tu perfil y activa el modo canal para acceder al Studio.</p>
        <Button asChild><a href="/profile">Ir a perfil</a></Button>
      </Card>
    );
  }

  const livePreview = {
    ...profile,
    banner_url: bannerUrl,
    accent_color: accentColor || null,
    location: location.trim() || null,
    language: language.trim() || null,
    bio: bio.trim() || null,
    channel_name: channelName.trim() || null,
    social_links: social,
  };

  return (
    <div className="max-w-7xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Studio</h1>
          <p className="text-muted-foreground text-sm">Personaliza el aspecto de tu canal con vista previa en directo.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-2">
            <a href={`/c/${user?.id}`} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4" />Ver mi canal
            </a>
          </Button>
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-5">
          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <ImagePlus className="h-4 w-4" />
              <h3 className="font-display font-semibold">Banner</h3>
            </div>
            <div className="h-32 rounded-lg overflow-hidden bg-surface-2 border border-border mb-3">
              {bannerUrl && <img src={bannerUrl} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex gap-2 flex-wrap">
              <label>
                <Button asChild variant="outline" disabled={uploadingBanner}>
                  <span className="cursor-pointer">{uploadingBanner ? "Subiendo..." : bannerUrl ? "Cambiar banner" : "Subir banner"}</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" disabled={uploadingBanner}
                  onChange={(e) => e.target.files?.[0] && handleBanner(e.target.files[0])} />
              </label>
              {bannerUrl && (
                <Button variant="ghost" onClick={removeBanner}>Quitar</Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Recomendado 1920x480, máx 8MB</p>
          </Card>

          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Tv className="h-4 w-4" />
              <h3 className="font-display font-semibold">Identidad del canal</h3>
            </div>
            <div className="space-y-3">
              <div>
                <Label htmlFor="cn">Nombre del canal</Label>
                <Input id="cn" value={channelName} onChange={(e) => setChannelName(e.target.value)} className="bg-surface-1 mt-1" />
              </div>
              <div>
                <Label htmlFor="bio2">Descripción</Label>
                <Textarea id="bio2" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} className="bg-surface-1 mt-1 min-h-24" placeholder="Cuenta de qué va tu canal..." />
                <p className="text-xs text-muted-foreground mt-1">{bio.length}/500</p>
              </div>
            </div>
          </Card>

          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="h-4 w-4" />
              <h3 className="font-display font-semibold">Color de acento</h3>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {ACCENT_PRESETS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAccentColor(c)}
                  className={`h-9 w-9 rounded-full border-2 transition ${accentColor === c ? "border-foreground scale-110" : "border-border"}`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
              <button
                onClick={() => setAccentColor("")}
                className={`h-9 w-9 rounded-full border-2 ${!accentColor ? "border-foreground" : "border-border"} bg-transparent text-xs`}
                aria-label="ninguno"
              >×</button>
            </div>
            <div className="flex items-center gap-2">
              <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} placeholder="#ffffff" className="bg-surface-1 max-w-[140px]" />
              <input type="color" value={accentColor || "#ffffff"} onChange={(e) => setAccentColor(e.target.value)} className="h-9 w-9 rounded cursor-pointer bg-transparent border border-border" />
            </div>
          </Card>

          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4" />
              <h3 className="font-display font-semibold">Ubicación e idioma</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="loc">Ubicación</Label>
                <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Madrid, España" className="bg-surface-1 mt-1" />
              </div>
              <div>
                <Label htmlFor="lng">Idioma</Label>
                <Input id="lng" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Español" className="bg-surface-1 mt-1" />
              </div>
            </div>
          </Card>

          <Card className="glass-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="h-4 w-4" />
              <h3 className="font-display font-semibold">Enlaces sociales</h3>
            </div>
            <div className="space-y-2">
              {[
                { k: "twitter" as const, Icon: Twitter, ph: "@usuario o URL" },
                { k: "instagram" as const, Icon: Instagram, ph: "@usuario o URL" },
                { k: "youtube" as const, Icon: Youtube, ph: "URL del canal" },
                { k: "tiktok" as const, Icon: LinkIcon, ph: "@usuario o URL" },
                { k: "github" as const, Icon: Github, ph: "usuario o URL" },
                { k: "website" as const, Icon: Globe, ph: "https://tuweb.com" },
              ].map(({ k, Icon, ph }) => (
                <div key={k} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input value={social[k] || ""} onChange={(e) => updateSocial(k, e.target.value)} placeholder={ph} className="bg-surface-1" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
            <Eye className="h-4 w-4" /> Vista previa en directo
          </div>
          <ChannelHeader
            profile={livePreview as any}
            videosCount={0}
            count={profile.subscriber_count}
            subscribed={false}
            isOwner={false}
            user={null}
            onToggle={() => {}}
          />
          <Separator className="my-6 bg-border" />
          <p className="text-xs text-muted-foreground">Así te ven los demás. Los cambios se aplican al guardar.</p>
        </div>
      </div>
    </div>
  );
};

const Studio = () => (
  <ProtectedRoute>
    <AppLayout><StudioInner /></AppLayout>
  </ProtectedRoute>
);

export default Studio;
