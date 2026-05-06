import { Fragment, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { detectPlatform, PLATFORM_META } from "@/lib/links";

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const MENTION_RE = /@([a-zA-Z0-9_.-]{2,30})/g;
const HASHTAG_RE = /#([a-zA-Z0-9_]{2,40})/g;

const isInternalLovable = (url: string) => /^https?:\/\/(?:[^/]*\.)?lovable\.app/i.test(url);

const toInternalPath = (url: string): string | null => {
  try {
    const u = new URL(url);
    if (/lovable\.app$/i.test(u.hostname)) return u.pathname + u.search + u.hash;
  } catch { /* */ }
  return null;
};

const handleFromUrl = (url: string): string | null => {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean);
    if (!seg.length) return null;
    const first = seg[0].replace(/^@/, "");
    return "/" + first;
  } catch { return null; }
};

type Token =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string }
  | { kind: "mention"; value: string }
  | { kind: "hashtag"; value: string };

const tokenize = (text: string): Token[] => {
  const tokens: Token[] = [];
  let lastIndex = 0;
  const combined = new RegExp(`${URL_RE.source}|${MENTION_RE.source}|${HASHTAG_RE.source}`, "g");
  let m: RegExpExecArray | null;
  while ((m = combined.exec(text)) !== null) {
    if (m.index > lastIndex) tokens.push({ kind: "text", value: text.slice(lastIndex, m.index) });
    if (m[1]) tokens.push({ kind: "url", value: m[1] });
    else if (m[2]) tokens.push({ kind: "mention", value: m[2] });
    else if (m[3]) tokens.push({ kind: "hashtag", value: m[3] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) tokens.push({ kind: "text", value: text.slice(lastIndex) });
  return tokens;
};

// ---------- Spoiler ----------
const Spoiler = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
      className={`rounded px-1 transition align-baseline ${
        open ? "bg-foreground/10 text-foreground" : "bg-foreground text-foreground hover:text-foreground/70"
      }`}
      style={open ? undefined : { color: "transparent", textShadow: "none" }}
      aria-label={open ? "Ocultar spoiler" : "Mostrar spoiler"}
    >
      {children}
    </button>
  );
};

// ---------- Markdown inline parser ----------
// Supports: **bold**, *italic* (or _italic_), ~~strike~~, `code`, ||spoiler||
type MdNode = { type: "text" | "bold" | "italic" | "strike" | "code" | "spoiler"; value: string | MdNode[] };

const MD_PATTERNS: { type: MdNode["type"]; re: RegExp; raw?: boolean }[] = [
  { type: "spoiler", re: /\|\|([\s\S]+?)\|\|/ },
  { type: "code", re: /`([^`\n]+?)`/, raw: true },
  { type: "bold", re: /\*\*([\s\S]+?)\*\*/ },
  { type: "strike", re: /~~([\s\S]+?)~~/ },
  { type: "italic", re: /(?<![A-Za-z0-9_])[*_]([^*_\n]+?)[*_](?![A-Za-z0-9_])/ },
];

const parseMarkdown = (text: string): MdNode[] => {
  if (!text) return [];
  // Find earliest pattern match
  let earliest: { idx: number; len: number; type: MdNode["type"]; inner: string; raw?: boolean } | null = null;
  for (const p of MD_PATTERNS) {
    const m = p.re.exec(text);
    if (m && (earliest === null || m.index < earliest.idx)) {
      earliest = { idx: m.index, len: m[0].length, type: p.type, inner: m[1], raw: p.raw };
    }
  }
  if (!earliest) return [{ type: "text", value: text }];
  const out: MdNode[] = [];
  if (earliest.idx > 0) out.push({ type: "text", value: text.slice(0, earliest.idx) });
  out.push({
    type: earliest.type,
    value: earliest.raw ? earliest.inner : parseMarkdown(earliest.inner),
  });
  out.push(...parseMarkdown(text.slice(earliest.idx + earliest.len)));
  return out;
};

const renderMd = (nodes: MdNode[], renderText: (s: string, key: string) => ReactNode, keyPrefix = "m"): ReactNode => {
  return nodes.map((n, i) => {
    const key = `${keyPrefix}-${i}`;
    if (n.type === "text") return <Fragment key={key}>{renderText(n.value as string, key)}</Fragment>;
    if (n.type === "code")
      return <code key={key} className="px-1 py-0.5 rounded bg-surface-2 text-[0.85em] font-mono">{n.value as string}</code>;
    const inner = renderMd(n.value as MdNode[], renderText, key);
    if (n.type === "bold") return <strong key={key} className="font-semibold">{inner}</strong>;
    if (n.type === "italic") return <em key={key}>{inner}</em>;
    if (n.type === "strike") return <span key={key} className="line-through opacity-80">{inner}</span>;
    if (n.type === "spoiler") return <Spoiler key={key}>{inner}</Spoiler>;
    return null;
  });
};

const renderTokens = (text: string, baseKey: string): ReactNode => {
  const linkClass = "underline underline-offset-2 hover:text-foreground text-foreground/90 break-all";
  const tagClass = "text-foreground/80 hover:text-foreground font-medium";
  const platformChip =
    "inline-flex items-center gap-1 align-baseline rounded-full px-1.5 py-0.5 text-[0.85em] font-medium border border-border bg-surface-1 hover:bg-surface-2 transition no-underline";

  return tokenize(text).map((t, i) => {
    const k = `${baseKey}-t-${i}`;
    if (t.kind === "text") return <Fragment key={k}>{t.value}</Fragment>;
    if (t.kind === "url") {
      const internal = isInternalLovable(t.value) ? toInternalPath(t.value) : null;
      if (internal) {
        return <Link key={k} to={internal} className={linkClass}>{t.value}</Link>;
      }
      const platform = detectPlatform(t.value);
      if (platform !== "website" && platform !== "other") {
        const meta = PLATFORM_META[platform];
        const Icon = meta.icon;
        const handle = handleFromUrl(t.value);
        return (
          <a key={k} href={t.value} target="_blank" rel="noopener noreferrer nofollow" className={platformChip}>
            <span
              className="h-4 w-4 rounded-full inline-flex items-center justify-center"
              style={{ backgroundColor: meta.brand, color: meta.fg }}
            >
              <Icon className="h-2.5 w-2.5" />
            </span>
            <span className="truncate max-w-[12ch]">{handle ?? meta.label}</span>
          </a>
        );
      }
      return <a key={k} href={t.value} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>{t.value}</a>;
    }
    if (t.kind === "mention")
      return <Link key={k} to={`/u/${t.value}`} className={tagClass}>@{t.value}</Link>;
    return <Link key={k} to={`/search?q=${encodeURIComponent("#" + t.value)}`} className={tagClass}>#{t.value}</Link>;
  });
};

export const RichText = ({ text, className }: { text: string; className?: string }) => {
  const lines = (text ?? "").split("\n");
  return (
    <p className={`whitespace-pre-wrap break-words ${className ?? ""}`}>
      {lines.map((line, li) => {
        const md = parseMarkdown(line);
        return (
          <Fragment key={`l-${li}`}>
            {renderMd(md, (s, key) => renderTokens(s, key), `l${li}`)}
            {li < lines.length - 1 ? "\n" : null}
          </Fragment>
        );
      })}
    </p>
  );
};

export const extractMentions = (text: string): string[] => {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, "g");
  while ((m = re.exec(text)) !== null) out.add(m[1].toLowerCase());
  return Array.from(out);
};

export const extractHashtags = (text: string): string[] => {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(HASHTAG_RE.source, "g");
  while ((m = re.exec(text)) !== null) out.add(m[1].toLowerCase());
  return Array.from(out);
};
