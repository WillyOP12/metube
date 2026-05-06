import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Trash2, BarChart3 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Poll {
  id: string;
  question: string;
  multi_choice: boolean;
  closes_at: string | null;
}
interface Option {
  id: string;
  text: string;
  position: number;
}

export const PollBlock = ({
  postId,
  isOwner,
}: { postId: string; isOwner: boolean }) => {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    const { data: pl } = await supabase
      .from("polls")
      .select("id, question, multi_choice, closes_at")
      .eq("post_id", postId)
      .maybeSingle();
    if (!pl) { setPoll(null); setLoading(false); return; }
    setPoll(pl as Poll);
    const [{ data: opts }, { data: votes }] = await Promise.all([
      supabase.from("poll_options").select("id, text, position").eq("poll_id", pl.id).order("position"),
      supabase.from("poll_votes").select("option_id, user_id").eq("poll_id", pl.id),
    ]);
    setOptions((opts as Option[]) ?? []);
    const c: Record<string, number> = {};
    const mine = new Set<string>();
    (votes ?? []).forEach((v: any) => {
      c[v.option_id] = (c[v.option_id] ?? 0) + 1;
      if (user && v.user_id === user.id) mine.add(v.option_id);
    });
    setCounts(c);
    setMyVotes(mine);
    setPending(mine);
    setLoading(false);
  }, [postId, user]);

  useEffect(() => { load(); }, [load]);

  if (loading) return null;
  if (!poll) return null;

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const closed = poll.closes_at ? new Date(poll.closes_at).getTime() < Date.now() : false;
  const hasVoted = myVotes.size > 0;
  const showResults = closed || hasVoted || isOwner;

  const togglePending = (id: string) => {
    if (closed || hasVoted) return;
    setPending((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else {
        if (!poll.multi_choice) n.clear();
        n.add(id);
      }
      return n;
    });
  };

  const submit = async () => {
    if (!user) { toast.error("Inicia sesión para votar"); return; }
    if (pending.size === 0) return;
    setSubmitting(true);
    const rows = Array.from(pending).map((option_id) => ({
      poll_id: poll.id, option_id, user_id: user.id,
    }));
    const { error } = await supabase.from("poll_votes").insert(rows);
    setSubmitting(false);
    if (error) toast.error("No se pudo registrar el voto");
    else { toast.success("¡Voto registrado!"); load(); }
  };

  const removeMyVote = async () => {
    if (!user) return;
    const { error } = await supabase.from("poll_votes").delete().eq("poll_id", poll.id).eq("user_id", user.id);
    if (error) toast.error("No se pudo quitar el voto");
    else load();
  };

  const deletePoll = async () => {
    if (!confirm("¿Eliminar la encuesta?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", poll.id);
    if (error) toast.error("No se pudo eliminar");
    else { toast.success("Encuesta eliminada"); load(); }
  };

  return (
    <div className="mt-3 rounded-lg border border-border bg-surface-1 p-3">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div>
            <p className="font-medium text-sm">{poll.question}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {total} {total === 1 ? "voto" : "votos"}
              {poll.multi_choice ? " · selección múltiple" : ""}
              {poll.closes_at ? (closed
                ? " · cerrada"
                : ` · cierra ${formatDistanceToNow(new Date(poll.closes_at), { addSuffix: true, locale: es })}`) : ""}
            </p>
          </div>
        </div>
        {isOwner && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={deletePoll}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {options.map((o) => {
          const count = counts[o.id] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const checked = pending.has(o.id);
          const voted = myVotes.has(o.id);
          if (showResults) {
            return (
              <div key={o.id} className="relative rounded-md border border-border overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-foreground/10 transition-all"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    {voted && <Check className="h-3.5 w-3.5 text-foreground" />}
                    <span className="truncate">{o.text}</span>
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0">{pct}% · {count}</span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => togglePending(o.id)}
              className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                checked ? "border-foreground bg-surface-2" : "border-border hover:bg-surface-2"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <span className={`h-3.5 w-3.5 rounded-${poll.multi_choice ? "sm" : "full"} border ${checked ? "bg-foreground border-foreground" : "border-foreground/40"}`} />
                {o.text}
              </span>
            </button>
          );
        })}
      </div>

      {!showResults && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={submit} disabled={submitting || pending.size === 0}>
            Votar
          </Button>
        </div>
      )}
      {showResults && hasVoted && !closed && (
        <div className="mt-3 flex justify-end">
          <Button size="sm" variant="ghost" onClick={removeMyVote}>Quitar mi voto</Button>
        </div>
      )}
    </div>
  );
};
