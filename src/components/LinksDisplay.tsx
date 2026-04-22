import { Link } from "react-router-dom";
import { PLATFORM_META, type RichLink } from "@/lib/links";

const isInternal = (url: string) => url.startsWith("/") || /^https?:\/\/(?:[^/]*\.)?(?:mtbe\.lovable\.app|lovable\.app)/i.test(url);
const toInternalPath = (url: string): string | null => {
  if (url.startsWith("/")) return url;
  try {
    const u = new URL(url);
    if (/lovable\.app$/i.test(u.hostname)) return u.pathname + u.search + u.hash;
  } catch { /* */ }
  return null;
};

export const LinksDisplay = ({ links, accent }: { links: RichLink[]; accent?: string | null }) => {
  if (!links?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l, i) => {
        const meta = PLATFORM_META[l.platform];
        const Icon = meta.icon;
        const label = l.label || meta.label;
        const internalPath = isInternal(l.url) ? toInternalPath(l.url) : null;
        const className = "inline-flex items-center gap-2 rounded-full border border-border bg-surface-1 hover:bg-surface-2 px-3 py-1.5 text-sm transition";
        const style = accent ? { borderColor: `${accent}55` } : undefined;
        if (internalPath) {
          return (
            <Link key={i} to={internalPath} className={className} style={style}>
              <Icon className="h-4 w-4" />
              <span className="truncate max-w-[180px]">{label}</span>
            </Link>
          );
        }
        return (
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className={className} style={style}>
            <Icon className="h-4 w-4" />
            <span className="truncate max-w-[180px]">{label}</span>
          </a>
        );
      })}
    </div>
  );
};
