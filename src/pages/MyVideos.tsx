import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, ExternalLink, Eye, Film, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatViews, formatDuration } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface Row {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  views: number;
  is_short: boolean;
  duration: number | null;
  created_at: string;
}

const MyVideosInner = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);

  useEffect(() => { document.title = "Mis vídeos — MeTube"; }, []);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("videos")
      .select("id, title, description, thumbnail_url, views, is_short, duration, created_at")
      .eq("channel_id", user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar tus vídeos");
    setVideos((data ?? []) as Row[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user?.id]);

  const openEdit = (v: Row) => {
    setEditing(v);
    setEditTitle(v.title);
    setEditDesc(v.description ?? "");
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editTitle.trim()) return toast.error("Título obligatorio");
    setSaving(true);
    const { error } = await supabase
      .from("videos")
      .update({ title: editTitle.trim(), description: editDesc.trim() || null })
      .eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error("No se pudo guardar");
    toast.success("Vídeo actualizado");
    setEditing(null);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("videos").delete().eq("id", deleting.id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Vídeo eliminado");
    setDeleting(null);
    load();
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/studio"><ArrowLeft className="h-4 w-4 mr-1" />Studio</Link>
          </Button>
          <div>
            <h1 className="font-display text-3xl font-bold">Mis vídeos</h1>
            <p className="text-muted-foreground text-sm">Gestiona, edita o elimina tus subidas.</p>
          </div>
        </div>
        <Button asChild><Link to="/upload">Subir nuevo</Link></Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
      ) : videos.length === 0 ? (
        <Card className="glass-card p-10 text-center">
          <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Aún no has subido nada.</p>
          <Button asChild><Link to="/upload">Subir tu primer vídeo</Link></Button>
        </Card>
      ) : (() => {
        const longs = videos.filter(v => !v.is_short);
        const shorts = videos.filter(v => v.is_short);
        const renderRow = (v: Row) => (
          <Card key={v.id} className="glass-card p-3 flex flex-col sm:flex-row gap-4">
            <Link to={v.is_short ? `/shorts/${v.id}` : `/watch/${v.id}`} className={`relative shrink-0 w-full ${v.is_short ? "sm:w-28 aspect-[9/16]" : "sm:w-48 aspect-video"} rounded-lg overflow-hidden bg-surface-2 group`}>
              {v.thumbnail_url ? (
                <img src={v.thumbnail_url} alt={v.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground">{v.is_short ? <Film className="h-8 w-8" /> : <Video className="h-8 w-8" />}</div>
              )}
              {v.duration && (
                <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/80 text-white font-mono">{formatDuration(v.duration)}</span>
              )}
              {v.is_short && (
                <span className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-semibold">SHORT</span>
              )}
            </Link>
            <div className="flex-1 min-w-0 flex flex-col">
              <Link to={v.is_short ? `/shorts/${v.id}` : `/watch/${v.id}`} className="font-display font-semibold truncate hover:underline">{v.title}</Link>
              {v.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{v.description}</p>}
              <p className="text-xs text-muted-foreground mt-auto pt-2 flex items-center gap-3">
                <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(v.views)}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: es })}</span>
              </p>
            </div>
            <div className="flex sm:flex-col gap-2 shrink-0 sm:items-end">
              <Button variant="outline" size="sm" onClick={() => openEdit(v)} className="gap-1"><Pencil className="h-3.5 w-3.5" />Editar</Button>
              <Button variant="outline" size="sm" asChild className="gap-1"><Link to={v.is_short ? `/shorts/${v.id}` : `/watch/${v.id}`}><ExternalLink className="h-3.5 w-3.5" />Ver</Link></Button>
              <Button variant="ghost" size="sm" onClick={() => setDeleting(v)} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" />Borrar</Button>
            </div>
          </Card>
        );
        const empty = (label: string) => (
          <Card className="glass-card p-8 text-center text-muted-foreground text-sm">No tienes {label} todavía.</Card>
        );
        return (
          <Tabs defaultValue="videos">
            <TabsList className="bg-surface-1 border border-border">
              <TabsTrigger value="videos">Vídeos ({longs.length})</TabsTrigger>
              <TabsTrigger value="shorts">Shorts ({shorts.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="videos" className="mt-4 space-y-3">
              {longs.length === 0 ? empty("vídeos") : longs.map(renderRow)}
            </TabsContent>
            <TabsContent value="shorts" className="mt-4 space-y-3">
              {shorts.length === 0 ? empty("shorts") : shorts.map(renderRow)}
            </TabsContent>
          </Tabs>
        );
      })()}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar vídeo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="t">Título</Label>
              <Input id="t" value={editTitle} onChange={(e) => setEditTitle(e.target.value.slice(0, 120))} className="bg-surface-1 mt-1" />
            </div>
            <div>
              <Label htmlFor="d">Descripción</Label>
              <Textarea id="d" value={editDesc} onChange={(e) => setEditDesc(e.target.value.slice(0, 2000))} className="bg-surface-1 mt-1 min-h-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este vídeo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrarán también sus likes, comentarios y estadísticas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const MyVideos = () => (
  <ProtectedRoute>
    <AppLayout><MyVideosInner /></AppLayout>
  </ProtectedRoute>
);

export default MyVideos;
