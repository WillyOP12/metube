import { Fragment } from "react";
import { Link } from "react-router-dom";

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

type Token =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string }
  | { kind: "mention"; value: string }
  | { kind: "hashtag"; value: string };

const tokenize = (text: string): Token[] => {
  // Combinamos regex: detectamos primero URLs, luego sobre el resto menciones y hashtags
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

export const RichText = ({ text, className }: { text: string; className?: string }) => {
  const linkClass = "underline underline-offset-2 hover:text-foreground text-foreground/90 break-all";
  const tagClass = "text-foreground/80 hover:text-foreground font-medium";
  const lines = text.split("\n");
  return (
    <p className={`whitespace-pre-wrap break-words ${className ?? ""}`}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {tokenize(line).map((t, i) => {
            if (t.kind === "text") return <Fragment key={i}>{t.value}</Fragment>;
            if (t.kind === "url") {
              const internal = isInternalLovable(t.value) ? toInternalPath(t.value) : null;
              return internal
                ? <Link key={i} to={internal} className={linkClass}>{t.value}</Link>
                : <a key={i} href={t.value} target="_blank" rel="noopener noreferrer nofollow" className={linkClass}>{t.value}</a>;
            }
            if (t.kind === "mention") {
              return <Link key={i} to={`/u/${t.value}`} className={tagClass}>@{t.value}</Link>;
            }
            return <Link key={i} to={`/search?q=${encodeURIComponent("#" + t.value)}`} className={tagClass}>#{t.value}</Link>;
          })}
          {li < lines.length - 1 ? "\n" : null}
        </Fragment>
      ))}
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
