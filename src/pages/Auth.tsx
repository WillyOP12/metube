import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

const Auth = () => {
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("¡Bienvenido de vuelta!");
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cuenta creada. ¡Bienvenido a MeTube!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(0_0%_15%),transparent_70%)] pointer-events-none" />
      <Link to="/" className="mb-8 z-10"><Logo /></Link>
      <Card className="w-full max-w-md p-6 glass-card z-10 animate-slide-up">
        <h1 className="font-display text-2xl font-semibold mb-1">Accede a MeTube</h1>
        <p className="text-muted-foreground text-sm mb-6">Comparte vídeos, suscríbete y crea tu canal.</p>

        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2 mb-6 bg-surface-2">
            <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
            <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <Label htmlFor="si-email">Correo</Label>
                <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-1 mt-1" />
              </div>
              <div>
                <Label htmlFor="si-pass">Contraseña</Label>
                <Input id="si-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-surface-1 mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4">
              <div>
                <Label htmlFor="su-name">Nombre a mostrar</Label>
                <Input id="su-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tu nombre" className="bg-surface-1 mt-1" />
              </div>
              <div>
                <Label htmlFor="su-email">Correo</Label>
                <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-1 mt-1" />
              </div>
              <div>
                <Label htmlFor="su-pass">Contraseña</Label>
                <Input id="su-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="bg-surface-1 mt-1" />
                <p className="text-xs text-muted-foreground mt-1">Mínimo 6 caracteres.</p>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Creando..." : "Crear cuenta"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
