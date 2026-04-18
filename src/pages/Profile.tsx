import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Camera, Tv, User as UserIcon } from "lucide-react";

const ProfileInner = () => {
  const { user } = useAuth();
  const { profile, loading, refresh } = useProfile();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [channelName, setChannelName] = useState("");
  const [isChannel, setIsChannel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    document.title = "Mi perfil — MeTube";
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setChannelName(profile.channel_name ?? "");
      setIsChannel(profile.is_channel);
    }
  }, [profile]);

  const initials = (displayName || username || "?")
    .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const handleAvatar = async (file: File) => {
    if (!user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });
    if (upErr) {
      console.error("Avatar upload error:", upErr);
      toast.error(`Error al subir: ${upErr.message}`);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    if (dbErr) {
      console.error("Profile update error:", dbErr);
      toast.error("Error guardando avatar");
    } else {
      toast.success("Avatar actualizado");
      refresh();
    }
    setUploading(false);
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      channel_name: isChannel ? (channelName.trim() || displayName.trim()) : null,
      is_channel: isChannel,
    }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Ese nombre de usuario ya existe" : "No se pudo guardar");
      return;
    }
    toast.success("Perfil guardado");
    refresh();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div>
        <h1 className="font-display text-3xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground mt-1">Edita tu información pública y gestiona tu canal.</p>
      </div>

      <Card className="glass-card p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <Avatar className="h-20 w-20 border border-border">
              <AvatarImage src={profile?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-surface-2 text-xl">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer hover:scale-105 transition">
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" disabled={uploading}
                onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
            </label>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{displayName || "Sin nombre"}</h2>
            <p className="text-sm text-muted-foreground">@{username || "sin_usuario"}</p>
            {uploading && <p className="text-xs mt-1">Subiendo...</p>}
          </div>
        </div>

        <Separator className="my-6 bg-border" />

        <div className="space-y-4">
          <div>
            <Label htmlFor="dn">Nombre a mostrar</Label>
            <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-surface-1 mt-1" />
          </div>
          <div>
            <Label htmlFor="un">Nombre de usuario</Label>
            <Input id="un" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, "_").toLowerCase())} className="bg-surface-1 mt-1" />
          </div>
          <div>
            <Label htmlFor="bio">Biografía</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, 280))} className="bg-surface-1 mt-1 min-h-24" />
            <p className="text-xs text-muted-foreground mt-1">{bio.length}/280</p>
          </div>
        </div>
      </Card>

      <Card className="glass-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            {isChannel ? <Tv className="h-6 w-6 mt-1" /> : <UserIcon className="h-6 w-6 mt-1" />}
            <div>
              <h3 className="font-display font-semibold text-lg">
                {isChannel ? "Tienes un canal" : "Convertir cuenta en canal"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {isChannel
                  ? "Puedes subir vídeos, shorts y publicar en el feed de comunidad. Desactiva para volver a cuenta normal."
                  : "Activa para subir vídeos y publicar contenido. Puedes volver a cuenta normal cuando quieras."}
              </p>
            </div>
          </div>
          <Switch checked={isChannel} onCheckedChange={setIsChannel} />
        </div>

        {isChannel && (
          <div className="mt-5">
            <Label htmlFor="cn">Nombre del canal</Label>
            <Input id="cn" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder={displayName} className="bg-surface-1 mt-1" />
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
};

const Profile = () => (
  <ProtectedRoute>
    <AppLayout><ProfileInner /></AppLayout>
  </ProtectedRoute>
);

export default Profile;
