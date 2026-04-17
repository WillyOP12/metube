import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flag, ShieldOff, ShieldCheck, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Report {
  id: string;
  reporter_id: string;
  target_type: "video" | "comment" | "post" | "channel";
  target_id: string;
  reason: string;
  details: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
  resolution_note: string | null;
}

const STATUS_LABELS: Record<Report["status"], string> = {
  pending: "Pendiente",
  reviewing: "En revisión",
  resolved: "Resuelto",
  dismissed: "Descartado",
};

const AdminInner = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<Report["status"] | "all">("pending");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error("Error cargando reportes");
    else setReports((data ?? []) as Report[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const updateStatus = async (id: string, status: Report["status"]) => {
    const { error } = await supabase.from("reports").update({
      status,
      resolved_by: user?.id,
    }).eq("id", id);
    if (error) toast.error("Error actualizando");
    else { toast.success("Reporte actualizado"); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error("Error eliminando");
    else { toast.success("Reporte eliminado"); load(); }
  };

  const counts = reports.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6" />
        <div>
          <h1 className="font-display text-3xl font-bold">Panel de moderación</h1>
          <p className="text-muted-foreground text-sm">Revisa y resuelve los reportes de la comunidad.</p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="bg-surface-2">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="reviewing">En revisión</TabsTrigger>
          <TabsTrigger value="resolved">Resueltos</TabsTrigger>
          <TabsTrigger value="dismissed">Descartados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Cargando...</div>
          ) : counts === 0 ? (
            <Card className="glass-card p-12 text-center">
              <Flag className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Sin reportes en esta categoría.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <Card key={r.id} className="glass-card p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[260px]">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="capitalize border-border">{r.target_type}</Badge>
                        <Badge variant="outline" className={`border-border ${
                          r.status === "pending" ? "text-foreground" :
                          r.status === "reviewing" ? "text-foreground" :
                          r.status === "resolved" ? "text-muted-foreground" : "text-muted-foreground"
                        }`}>
                          {STATUS_LABELS[r.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                      <p className="font-display font-semibold">{r.reason}</p>
                      {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
                      <p className="text-xs text-muted-foreground mt-2 font-mono">ID objetivo: {r.target_id}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {r.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "reviewing")}>
                          <Eye className="h-4 w-4 mr-1" /> Revisar
                        </Button>
                      )}
                      {r.status !== "resolved" && (
                        <Button size="sm" onClick={() => updateStatus(r.id, "resolved")}>
                          <ShieldCheck className="h-4 w-4 mr-1" /> Resolver
                        </Button>
                      )}
                      {r.status !== "dismissed" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "dismissed")}>
                          <ShieldOff className="h-4 w-4 mr-1" /> Descartar
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const AdminGuard = () => {
  const { isModerator, loading } = useIsAdmin();
  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
  }
  if (!isModerator) {
    return (
      <Card className="glass-card p-12 text-center max-w-md mx-auto">
        <ShieldOff className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold mb-1">Sin acceso</h2>
        <p className="text-muted-foreground">Necesitas rol de admin o moderador para ver esta página.</p>
      </Card>
    );
  }
  return <AdminInner />;
};

const Admin = () => (
  <ProtectedRoute>
    <AppLayout><AdminGuard /></AppLayout>
  </ProtectedRoute>
);

export default Admin;
