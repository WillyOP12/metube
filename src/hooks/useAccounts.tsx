import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface SavedAccount {
  user_id: string;
  email: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  refresh_token: string;
  access_token: string;
}

const STORAGE_KEY = "metube.accounts.v1";

const read = (): SavedAccount[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const write = (list: SavedAccount[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const useAccounts = () => {
  const { user, session } = useAuth();
  const [accounts, setAccounts] = useState<SavedAccount[]>(read);

  // Mantener la cuenta activa sincronizada con tokens frescos
  useEffect(() => {
    if (!user || !session) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const updated: SavedAccount = {
        user_id: user.id,
        email: user.email ?? "",
        display_name: data?.display_name ?? null,
        username: data?.username ?? null,
        avatar_url: data?.avatar_url ?? null,
        refresh_token: session.refresh_token,
        access_token: session.access_token,
      };
      const list = read().filter(a => a.user_id !== user.id);
      list.unshift(updated);
      write(list);
      setAccounts(list);
    })();
  }, [user?.id, session?.access_token]);

  const switchTo = useCallback(async (acc: SavedAccount) => {
    const { error } = await supabase.auth.setSession({
      access_token: acc.access_token,
      refresh_token: acc.refresh_token,
    });
    if (error) {
      // Token caducado: eliminamos y obligamos relogin
      const list = read().filter(a => a.user_id !== acc.user_id);
      write(list);
      setAccounts(list);
      throw error;
    }
  }, []);

  const remove = useCallback((userId: string) => {
    const list = read().filter(a => a.user_id !== userId);
    write(list);
    setAccounts(list);
  }, []);

  return { accounts, switchTo, remove };
};
