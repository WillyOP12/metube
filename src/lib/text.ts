// Utilities to extract hashtags / mentions / URLs from free-form text.

export const HASHTAG_RE = /(?:^|\s)#([a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]{2,30})/g;
export const MENTION_RE = /(?:^|\s)@([a-zA-Z0-9_]{2,30})/g;
export const URL_RE = /\bhttps?:\/\/[^\s<>"]+/g;

export const extractHashtags = (text: string): string[] => {
  const out = new Set<string>();
  for (const m of text.matchAll(HASHTAG_RE)) out.add(m[1].toLowerCase());
  return Array.from(out);
};

export const extractMentionUsernames = (text: string): string[] => {
  const out = new Set<string>();
  for (const m of text.matchAll(MENTION_RE)) out.add(m[1].toLowerCase());
  return Array.from(out);
};

// Parse a hashtag string from upload form: "#one #two,three" -> ["one","two","three"]
export const parseHashtagInput = (raw: string): string[] => {
  return Array.from(
    new Set(
      raw
        .split(/[\s,]+/)
        .map(t => t.replace(/^#/, "").trim().toLowerCase())
        .filter(t => /^[a-z0-9_áéíóúñ]{2,30}$/i.test(t))
    )
  );
};
