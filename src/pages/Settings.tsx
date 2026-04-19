import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, KeyRound, Trash2, LogOut, Settings as SettingsIcon } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Email no válido" }).max(255);
const passwordSchema = z.string().min(8, { message: "Mínimo 8 caracteres" }).max(72);

const SettingsInner = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = "Ajustes — MeTube";
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const updateEmail = async () => {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (parsed.data === user?.email) return toast.info("Ese ya es tu email actual");
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: parsed.data });
    setSavingEmail(false);
    if (error) return toast.error("No se pudo actualizar el email");
    toast.success("Te hemos enviado un correo de confirmación.");
  };

  const updatePassword = async () => {
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) return toast.error(parsed.error.errors[0].message);
    if (newPassword !== confirmPassword) return toast.error("Las contraseñas no coinciden");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setSavingPassword(false);
    if (error) return toast.error("No se pudo actualizar la contraseña");
    setNewPassword(""); setConfirmPassword("");
    toast.success("Contraseña actualizada");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const { error } = await supabase.rpc("delete_my_account");
    setDeleting(false);
    if (error) return toast.error("No se pudo eliminar la cuenta");
    await signOut();
    toast.success("Cuenta eliminada");
    navigate("/", { replace: true });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6" />
        <div>
          <h1 className="font-display text-3xl font-bold">Ajustes</h1>
          <p className="text-muted-foreground text-sm">Gestiona tu cuenta y seguridad.</p>
        </div>
      </div>

      <Card className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5" />
          <h2 className="font-display text-lg font-semibold">Correo electrónico</h2>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-surface-1 mt-1" />
        </div>
        <Button onClick={updateEmail} disabled={savingEmail}>
          {savingEmail ? "Actualizando..." : "Actualizar email"}
        </Button>
      </Card>

      <Card className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <KeyRound className="h-5 w-5" />
          <h2 className="font-display text-lg font-semibold">Cambiar contraseña</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="np">Nueva contraseña</Label>
            <Input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-surface-1 mt-1" />
          </div>
          <div>
            <Label htmlFor="cp">Confirmar</Label>
            <Input id="cp" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-surface-1 mt-1" />
          </div>
        </div>
        <Button onClick={updatePassword} disabled={savingPassword || !newPassword}>
          {savingPassword ? "Actualizando..." : "Cambiar contraseña"}
        </Button>
      </Card>

      <Card className="glass-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Sesión</h2>
        <p className="text-sm text-muted-foreground">Cerrar sesión en este dispositivo.</p>
        <Button variant="outline" onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Button>
      </Card>

      <Card className="glass-card p-6 space-y-4 border-destructive/40">
        <h2 className="font-display text-lg font-semibold text-destructive">Zona de peligro</h2>
        <p className="text-sm text-muted-foreground">
          Al eliminar tu cuenta se borrarán tus vídeos, comentarios, suscripciones y todos tus datos. Esta acción no se puede deshacer.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" /> Eliminar mi cuenta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tu cuenta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es permanente. Se borrarán todos tus datos (vídeos, comentarios, listas, etc.).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAccount} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Eliminando..." : "Sí, eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      <Separator className="bg-border" />
      <p className="text-xs text-muted-foreground text-center">MeTube · v1.0</p>
    </div>
  );
};

const Settings = () => (
  <ProtectedRoute>
    <AppLayout><SettingsInner /></AppLayout>
  </ProtectedRoute>
);
export default Settings;
