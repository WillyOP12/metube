import { useProfile } from "@/hooks/useProfile";
import { Card } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const SuspensionBanner = () => {
  const { profile } = useProfile();
  if (!profile?.suspended_until) return null;
  const until = new Date(profile.suspended_until);
  if (until <= new Date()) return null;
  return (
    <Card className="glass-card p-4 mb-4 border-destructive/40 flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-semibold">Tu cuenta está temporalmente suspendida (modo solo lectura)</p>
        <p className="text-muted-foreground">
          No puedes publicar, comentar, dar like ni suscribirte hasta {formatDistanceToNow(until, { addSuffix: true, locale: es })}.
          {profile.suspension_reason && <> Motivo: <span className="text-foreground">{profile.suspension_reason}</span></>}
        </p>
      </div>
    </Card>
  );
};
