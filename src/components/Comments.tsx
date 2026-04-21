import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportDialog } from "./ReportDialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

interface CommentRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export const Comments = ({ videoId }: { videoId: string }) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: rows, error } = await supabase
      .from("comments")
      .select("id, user_id, content, created_at")
      .eq("video_id", videoId)
      .is("parent_id", null)
      .order("created_at", { ascending: false });
    if (error || !rows) { setComments([]); setLoading(false); return; }
    const ids = Array.from(new Set(rows.map(r => r.user_id)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map<string, CommentRow["author"]>();
    (profs ?? []).forEach((p: any) => map.set(p.id, p));
    setComments(rows.map(r => ({ ...r, author: map.get(r.user_id) ?? null })));
    setLoading(false);
  }, [videoId]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión para comentar"); return; }
    if (!text.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      video_id: videoId,
      user_id: user.id,
      content: text.trim(),
    });
    setSubmitting(false);
    if (error) toast.error("No se pudo publicar");
    else { setText(""); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) toast.error("No se pudo eliminar");
    else load();
  };

  const initials = (n?: string | null) => (n || "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <section className="space-y-5">
      <h3 className="font-display text-xl font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> {comments.length} comentarios
      </h3>

      {user ? (
        <div className="flex gap-3">
          <Avatar className="h-9 w-9 border border-border shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-surface-2 text-xs">{initials(profile?.display_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 1000))}
              placeholder="Añade un comentario..."
              className="bg-surface-1 border-border min-h-20"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setText("")} disabled={!text}>Cancelar</Button>
              <Button size="sm" onClick={submit} disabled={submitting || !text.trim()}>Comentar</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface-1 p-4 text-sm text-muted-foreground">
          <Link to="/auth" className="text-foreground underline">Inicia sesión</Link> para dejar un comentario.
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando comentarios...</p>
      ) : (
        <div className="space-y-5">
          {comments.map((c) => {
            const name = c.author?.display_name || c.author?.username || "Usuario";
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-9 w-9 border border-border shrink-0">
                  <AvatarImage src={c.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-surface-2 text-xs">{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <ReportDialog targetType="comment" targetId={c.id} triggerLabel="Reportar" size="sm" variant="ghost" />
                    {user?.id === c.user_id && (
                      <Button variant="ghost" size="sm" onClick={() => remove(c.id)} className="gap-2 text-muted-foreground">
                        <Trash2 className="h-4 w-4" /> Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
