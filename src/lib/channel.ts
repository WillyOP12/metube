// Helpers for building channel URLs that prefer the username slug over the UUID.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (s?: string | null): boolean => !!s && UUID_RE.test(s);

export const channelHref = (
  p?: { username?: string | null; id?: string | null } | null,
): string => {
  if (!p) return "/";
  const slug = (p.username && p.username.trim()) || p.id || "";
  return `/c/${slug}`;
};
