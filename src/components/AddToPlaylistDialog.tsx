import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, ListPlus, Lock, Globe } from "lucide-react";
import { addToPlaylist, usePlaylists } from "@/hooks/usePlaylists";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";

interface Props { videoId: string }

export const AddToPlaylistDialog = ({ videoId }: Props) => {
  const { user } = useAuth();
  const { playlists, create, refresh } = usePlaylists();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleAdd = async (id: string) => {
    const ok = await addToPlaylist(id, videoId);
    if (ok) setOpen(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    const pl = await create(title.trim(), isPublic);
    if (pl) {
      await addToPlaylist(pl.id, videoId);
      setTitle(""); setCreating(false); setOpen(false);
      refresh();
    }
  };

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm" className="gap-2">
        <Link to="/auth"><ListPlus className="h-4 w-4" />Guardar</Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2"><ListPlus className="h-4 w-4" />Guardar</Button>
      </DialogTrigger>
      <DialogContent className="bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="font-display">Guardar en lista</DialogTitle>
        </DialogHeader>

        {!creating ? (
          <>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {playlists.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 text-center">Aún no tienes listas. Crea una.</p>
              )}
              {playlists.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleAdd(p.id)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-surface-2 transition text-left"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.video_count ?? 0} vídeos</p>
                  </div>
                  {p.is_public ? <Globe className="h-4 w-4 text-muted-foreground" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button onClick={() => setCreating(true)} variant="outline" className="w-full gap-2">
                <Plus className="h-4 w-4" />Crear nueva lista
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <Label htmlFor="pl-title">Título</Label>
                <Input id="pl-title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-surface-1 mt-1" placeholder="Mi nueva lista" autoFocus />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  {isPublic ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {isPublic ? "Pública" : "Privada"}
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setCreating(false)}>Atrás</Button>
              <Button onClick={handleCreate} disabled={!title.trim()}>Crear y añadir</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
