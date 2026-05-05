import { Link } from "react-router-dom";
import { PLATFORM_META, type RichLink } from "@/lib/links";

const isInternal = (url: string) =>
  url.startsWith("/") ||
  /^https?:\/\/(?:[^/]*\.)?(?:mtbe\.lovable\.app|lovable\.app)/i.test(url);

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

        const className =
          "group inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm font-medium border border-border bg-surface-1 hover:bg-surface-2 hover:-translate-y-0.5 transition shadow-sm";
        const iconWrap =
          "h-7 w-7 rounded-full flex items-center justify-center transition group-hover:scale-105";
        const iconStyle = { backgroundColor: meta.brand, color: meta.fg };
        const style = accent ? { borderColor: `${accent}55` } : undefined;

        const inner = (
          <>
            <span className={iconWrap} style={iconStyle}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <span className="truncate max-w-[180px]">{label}</span>
          </>
        );

        if (internalPath) {
          return (
            <Link key={i} to={internalPath} className={className} style={style}>
              {inner}
            </Link>
          );
        }
        return (
          <a key={i} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className={className} style={style}>
            {inner}
          </a>
        );
      })}
    </div>
  );
};
