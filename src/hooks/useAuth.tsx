import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const ACCOUNTS_STORAGE_KEY = "metube.accounts.v1";

const readSavedAccountSessions = (): Array<{ access_token: string; refresh_token: string }> => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item): item is { access_token: string; refresh_token: string } => (
          typeof item?.access_token === "string" && typeof item?.refresh_token === "string"
        ))
      : [];
  } catch {
    return [];
  }
};

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    // Then check existing session
    (async () => {
      const { data: { session: existing } } = await supabase.auth.getSession();

      if (existing) {
        setSession(existing);
        setUser(existing.user);
        setLoading(false);
        return;
      }

      for (const saved of readSavedAccountSessions()) {
        const { data, error } = await supabase.auth.setSession(saved);
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);
          return;
        }
      }

      setSession(null);
      setUser(null);
      setLoading(false);
    })();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
