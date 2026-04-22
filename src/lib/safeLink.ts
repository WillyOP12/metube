// Helper to redirect /shorts/* to /watch/* when the "no-addictive mode" is enabled.

const KEY = "metube.no_addictive_mode";

export const isNoAddictive = (): boolean => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

export const setNoAddictive = (v: boolean) => {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* */ }
  window.dispatchEvent(new CustomEvent("metube:no_addictive_change", { detail: v }));
};

export const shortsLink = (videoId: string): string =>
  isNoAddictive() ? `/watch/${videoId}` : `/shorts/${videoId}`;
