import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Hash } from "lucide-react";

interface UserSuggestion {
  kind: "user";
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}
interface TagSuggestion {
  kind: "tag";
  tag: string;
  count: number;
}
type Suggestion = UserSuggestion | TagSuggestion;

interface Props extends Omit<TextareaProps, "onChange"> {
  value: string;
  onChange: (next: string) => void;
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(({ value, onChange, ...rest }, ref) => {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"@" | "#">("@");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);

  const detect = () => {
    const el = inner.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const before = value.slice(0, pos);
    const mUser = /(?:^|\s)@([a-zA-Z0-9_.-]{0,30})$/.exec(before);
    const mTag  = /(?:^|\s)#([a-zA-Z0-9_]{0,40})$/.exec(before);
    if (mUser) { setMode("@"); setQuery(mUser[1]); setOpen(true); setActive(0); }
    else if (mTag) { setMode("#"); setQuery(mTag[1]); setOpen(true); setActive(0); }
    else { setOpen(false); setQuery(""); }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (mode === "@") {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .ilike("username", `${query}%`)
          .limit(6);
        if (!cancelled) setItems(((data ?? []) as any[]).map((u) => ({ kind: "user", ...u })));
      } else {
        // Sugerencias de hashtags: combinamos videos + posts
        const ql = query.toLowerCase();
        const [{ data: vh }, { data: ph }] = await Promise.all([
          supabase.from("videos").select("hashtags").not("hashtags", "is", null).limit(200),
          supabase.from("posts").select("hashtags").not("hashtags", "is", null).limit(200),
        ]);
        const counts: Record<string, number> = {};
        const accumulate = (rows: any[] | null) => (rows ?? []).forEach((r) => {
          (r.hashtags || []).forEach((t: string) => {
            const tl = String(t).toLowerCase();
            if (!ql || tl.startsWith(ql)) counts[tl] = (counts[tl] ?? 0) + 1;
          });
        });
        accumulate(vh as any); accumulate(ph as any);
        const sug: TagSuggestion[] = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([tag, count]) => ({ kind: "tag", tag, count }));
        if (ql && !sug.some((s) => s.tag === ql)) sug.unshift({ kind: "tag", tag: ql, count: 0 });
        if (!cancelled) setItems(sug);
      }
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open, mode]);

  const insert = (s: Suggestion) => {
    const el = inner.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    let token = "";
    if (s.kind === "user" && s.username) token = `@${s.username} `;
    else if (s.kind === "tag") token = `#${s.tag} `;
    if (!token) return;
    const re = mode === "@" ? /@([a-zA-Z0-9_.-]{0,30})$/ : /#([a-zA-Z0-9_]{0,40})$/;
    const before = value.slice(0, pos).replace(re, token);
    const after = value.slice(pos);
    const next = before + after;
    onChange(next);
    setOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const np = before.length;
      el.setSelectionRange(np, np);
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + items.length) % items.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insert(items[active]); }
    else if (e.key === "Escape") setOpen(false);
  };

  const initialsOf = (n?: string | null) => (n || "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="relative">
      <Textarea
        {...rest}
        ref={inner}
        value={value}
        onChange={(e) => { onChange(e.target.value); requestAnimationFrame(detect); }}
        onKeyDown={onKeyDown}
        onKeyUp={detect}
        onClick={detect}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && items.length > 0 && (
        <div className="absolute z-30 mt-1 w-72 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border bg-surface-1">
            {mode === "@" ? "Usuarios" : "Hashtags"}
          </div>
          {items.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insert(s); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2 ${i === active ? "bg-surface-2" : ""}`}
            >
              {s.kind === "user" ? (
                <>
                  <Avatar className="h-6 w-6 border border-border">
                    <AvatarImage src={s.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-surface-2">{initialsOf(s.display_name || s.username)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{s.display_name || s.username}</div>
                    <div className="text-xs text-muted-foreground truncate">@{s.username}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="h-6 w-6 rounded-full bg-surface-2 border border-border flex items-center justify-center">
                    <Hash className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate">#{s.tag}</div>
                    <div className="text-xs text-muted-foreground">{s.count > 0 ? `${s.count} usos` : "nuevo"}</div>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
MentionTextarea.displayName = "MentionTextarea";
