import { useCallback, useEffect, useState } from "react";

const KEY = "metube.focusMode.v1";

const read = (): boolean => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

export const useFocusMode = () => {
  const [enabled, setEnabled] = useState<boolean>(read());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) setEnabled(read()); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const set = useCallback((v: boolean) => {
    try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* */ }
    setEnabled(v);
    window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
  }, []);

  /** Mapea /shorts/x → /watch/x cuando focus mode está activo */
  const route = useCallback((path: string): string => {
    if (!enabled) return path;
    return path.replace(/^\/shorts(\/|$)/, "/watch$1");
  }, [enabled]);

  return { enabled, setEnabled: set, route };
};
