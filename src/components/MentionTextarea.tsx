import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Suggestion {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props extends Omit<TextareaProps, "onChange"> {
  value: string;
  onChange: (next: string) => void;
}

export const MentionTextarea = forwardRef<HTMLTextAreaElement, Props>(({ value, onChange, ...rest }, ref) => {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);

  // Detect @ before caret
  const detect = () => {
    const el = inner.current;
    if (!el) return;
    const pos = el.selectionStart ?? 0;
    const before = value.slice(0, pos);
    const m = /(?:^|\s)@([a-zA-Z0-9_.-]{1,30})$/.exec(before);
    if (m) { setQuery(m[1]); setOpen(true); setActive(0); }
    else { setOpen(false); setQuery(""); }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .ilike("username", `${query}%`)
        .limit(6);
      if (!cancelled) setItems((data ?? []) as Suggestion[]);
    }, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, open]);

  const insert = (s: Suggestion) => {
    const el = inner.current;
    if (!el || !s.username) return;
    const pos = el.selectionStart ?? 0;
    const before = value.slice(0, pos).replace(/@([a-zA-Z0-9_.-]{1,30})$/, `@${s.username} `);
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
      />
      {open && items.length > 0 && (
        <div className="absolute z-30 mt-1 w-72 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          {items.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insert(s); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-2 ${i === active ? "bg-surface-2" : ""}`}
            >
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={s.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-surface-2">{initialsOf(s.display_name || s.username)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate">{s.display_name || s.username}</div>
                <div className="text-xs text-muted-foreground truncate">@{s.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
MentionTextarea.displayName = "MentionTextarea";
