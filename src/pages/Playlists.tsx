import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ListVideo, Plus, Globe, Lock, Trash2, Play, BellRing } from "lucide-react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useSubscribedPlaylists } from "@/hooks/usePlaylistSubscription";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const PlaylistsInner = () => {
  const { playlists, loading, create, remove } = usePlaylists();
  const { playlists: subscribedPlaylists, loading: subLoading } = useSubscribedPlaylists();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => { document.title = "Mis listas — MeTube"; }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    const pl = await create(title.trim(), isPublic);
    if (pl) { setTitle(""); setOpen(false); }
  };

  return (
    <div className="max-w-6xl mx-auto animate-slide-up">
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Mis listas</h1>
          <p className="text-muted-foreground text-sm mt-1">Organiza tus vídeos favoritos.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Nueva lista</Button>
          </DialogTrigger>
          <DialogContent className="bg-popover border-border">
            <DialogHeader><DialogTitle className="font-display">Crear nueva lista</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="t">Título</Label>
                <Input id="t" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="bg-surface-1 mt-1" />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {isPublic ? "Pública" : "Privada"}
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>
            <DialogFooter><Button onClick={handleCreate} disabled={!title.trim()}>Crear</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>
      ) : playlists.length === 0 ? (
        <Card className="glass-card p-12 text-center">
          <ListVideo className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Aún no tienes listas. Crea la primera.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {playlists.map(p => (
            <Card key={p.id} className="glass-card overflow-hidden group">
              <Link to={`/playlist/${p.id}`} className="block">
                <div className="aspect-video bg-surface-2 relative overflow-hidden">
                  {p.cover ? (
                    <img src={p.cover} alt={p.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><ListVideo className="h-10 w-10 text-muted-foreground" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/85 text-xs font-medium flex items-center gap-1">
                    <Play className="h-3 w-3" />{p.video_count} vídeos
                  </div>
                </div>
              </Link>
              <div className="p-4 flex items-start justify-between gap-2">
                <Link to={`/playlist/${p.id}`} className="min-w-0 flex-1">
                  <h3 className="font-display font-semibold truncate group-hover:text-foreground">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {p.is_public ? <><Globe className="h-3 w-3" />Pública</> : <><Lock className="h-3 w-3" />Privada</>}
                  </p>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-popover border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar lista?</AlertDialogTitle>
                      <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(p.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!subLoading && subscribedPlaylists.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <BellRing className="h-5 w-5" />Listas suscritas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {subscribedPlaylists.map((p: any) => (
              <Card key={p.id} className="glass-card overflow-hidden group">
                <Link to={`/playlist/${p.id}`} className="block">
                  <div className="aspect-video bg-surface-2 flex items-center justify-center">
                    <ListVideo className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-semibold truncate">{p.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Globe className="h-3 w-3" />Pública
                    </p>
                  </div>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const Playlists = () => (
  <ProtectedRoute><AppLayout><PlaylistsInner /></AppLayout></ProtectedRoute>
);

export default Playlists;
