import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type ReportTarget = "video" | "comment" | "post" | "channel";

const REASONS = [
  "Spam o engaño",
  "Contenido sexual",
  "Violencia o contenido peligroso",
  "Discurso de odio o acoso",
  "Información falsa",
  "Infracción de derechos de autor",
  "Otro",
];

interface Props {
  targetType: ReportTarget;
  targetId: string;
  triggerLabel?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "icon";
}

export const ReportDialog = ({ targetType, targetId, triggerLabel = "Reportar", variant = "ghost", size = "sm" }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!user) {
      toast.error("Inicia sesión para reportar");
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details: details.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo enviar el reporte");
      return;
    }
    toast.success("Reporte enviado. Gracias por ayudar a la comunidad.");
    setOpen(false);
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Flag className="h-4 w-4" />
          {size !== "icon" && triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-popover border-border">
        <DialogHeader>
          <DialogTitle>Reportar contenido</DialogTitle>
          <DialogDescription>Cuéntanos qué pasa. Nuestro equipo revisará el reporte.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Motivo</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {REASONS.map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">{r}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="details" className="mb-2 block">Detalles (opcional)</Label>
            <Textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              placeholder="Añade contexto..."
              className="bg-surface-1 border-border min-h-24"
            />
            <p className="text-xs text-muted-foreground mt-1">{details.length}/500</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Enviando..." : "Enviar reporte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
