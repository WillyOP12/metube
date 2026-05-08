import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Flag, ShieldOff, ShieldCheck, Eye, Trash2, BarChart3, Users, Video as VideoIcon, MessageSquare,
  ShieldAlert, Search, Ban, MessageSquareWarning,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Report {
  id: string; reporter_id: string;
  target_type: "video" | "comment" | "post" | "channel"; target_id: string;
  reason: string; details: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  created_at: string; resolution_note: string | null;
}
interface Stats {
  users: number; videos: number; comments: number; pending_reports: number;
}
interface UserRow {
  id: string; display_name: string | null; username: string | null;
  avatar_url: string | null; created_at: string; is_channel: boolean;
  suspended_until: string | null;
  roles: ("admin" | "moderator" | "user")[];
}

const STATUS_LABELS: Record<Report["status"], string> = {
  pending: "Pendiente", reviewing: "En revisión", resolved: "Resuelto", dismissed: "Descartado",
};

const AdminInner = () => {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [stats, setStats] = useState<Stats>({ users: 0, videos: 0, comments: 0, pending_reports: 0 });
  const [tab, setTab] = useState("dashboard");

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    const [u, v, c, r] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("videos").select("id", { count: "exact", head: true }),
      supabase.from("comments").select("id", { count: "exact", head: true }),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);
    setStats({
      users: u.count ?? 0, videos: v.count ?? 0,
      comments: c.count ?? 0, pending_reports: r.count ?? 0,
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-6 w-6" />
        <div>
          <h1 className="font-display text-3xl font-bold">Panel de administración</h1>
          <p className="text-muted-foreground text-sm">Gestiona usuarios, contenido y reportes.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-surface-2">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Dashboard</TabsTrigger>
          <TabsTrigger value="reports"><Flag className="h-4 w-4 mr-1" />Reportes</TabsTrigger>
          {isAdmin && <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Usuarios</TabsTrigger>}
          <TabsTrigger value="content"><VideoIcon className="h-4 w-4 mr-1" />Contenido</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <DashboardTab stats={stats} />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ReportsTab userId={user?.id} onRefresh={loadStats} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="mt-6">
            <UsersTab currentUserId={user?.id} />
          </TabsContent>
        )}
        <TabsContent value="content" className="mt-6">
          <ContentTab onRefresh={loadStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <Card className="glass-card p-5">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-surface-2 flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="font-display text-2xl font-bold">{value.toLocaleString("es")}</p>
      </div>
    </div>
  </Card>
);

const DashboardTab = ({ stats }: { stats: Stats }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard icon={Users} label="Usuarios" value={stats.users} />
    <StatCard icon={VideoIcon} label="Vídeos" value={stats.videos} />
    <StatCard icon={MessageSquare} label="Comentarios" value={stats.comments} />
    <StatCard icon={Flag} label="Reportes pendientes" value={stats.pending_reports} />
  </div>
);

type ActionMode = "delete" | "suspend";

const ReportsTab = ({ userId, onRefresh }: { userId: string | undefined; onRefresh: () => void }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<Report["status"] | "all">("pending");
  const [loading, setLoading] = useState(true);
  const [actionReport, setActionReport] = useState<Report | null>(null);
  const [actionMode, setActionMode] = useState<ActionMode>("delete");
  const [message, setMessage] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");
  const [submitting, setSubmitting] = useState(false);

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
    const { error } = await supabase.from("reports").update({ status, resolved_by: userId }).eq("id", id);
    if (error) toast.error("Error actualizando");
    else { toast.success("Reporte actualizado"); load(); onRefresh(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error("Error eliminando");
    else { toast.success("Reporte eliminado"); load(); onRefresh(); }
  };

  // Resolve target -> owner user id and a human label
  const resolveTarget = async (r: Report): Promise<{ ownerId: string | null; label: string }> => {
    if (r.target_type === "video") {
      const { data } = await supabase.from("videos").select("channel_id, title").eq("id", r.target_id).maybeSingle();
      return { ownerId: data?.channel_id ?? null, label: data?.title ? `el vídeo "${data.title}"` : "el vídeo" };
    }
    if (r.target_type === "comment") {
      const { data } = await supabase.from("comments").select("user_id").eq("id", r.target_id).maybeSingle();
      return { ownerId: data?.user_id ?? null, label: "tu comentario" };
    }
    if (r.target_type === "post") {
      const { data } = await supabase.from("posts").select("channel_id").eq("id", r.target_id).maybeSingle();
      return { ownerId: data?.channel_id ?? null, label: "tu publicación" };
    }
    return { ownerId: r.target_id, label: "tu cuenta" };
  };

  const openAction = (r: Report, mode: ActionMode) => {
    setActionReport(r);
    setActionMode(mode);
    setMessage(mode === "delete"
      ? "Tu contenido ha sido eliminado por incumplir las normas de la comunidad."
      : "Tu cuenta ha sido suspendida temporalmente por incumplir las normas.");
    setSuspendDays("7");
  };

  const runAction = async () => {
    if (!actionReport) return;
    setSubmitting(true);
    const { ownerId, label } = await resolveTarget(actionReport);

    if (actionMode === "delete") {
      let delErr: any = null;
      if (actionReport.target_type === "video") {
        ({ error: delErr } = await supabase.from("videos").delete().eq("id", actionReport.target_id));
      } else if (actionReport.target_type === "comment") {
        ({ error: delErr } = await supabase.from("comments").delete().eq("id", actionReport.target_id));
      } else if (actionReport.target_type === "post") {
        ({ error: delErr } = await supabase.from("posts").delete().eq("id", actionReport.target_id));
      } else {
        delErr = { message: "No se puede borrar un canal desde aquí" };
      }
      if (delErr) { setSubmitting(false); return toast.error(delErr.message || "No se pudo eliminar"); }
      if (ownerId && message.trim()) {
        await supabase.rpc("admin_notify_user", { _user_id: ownerId, _message: `[Moderación] ${message.trim()} (${label})`, _link: null });
      }
      toast.success("Contenido eliminado y autor notificado");
    } else {
      if (!ownerId) { setSubmitting(false); return toast.error("No se pudo identificar al autor"); }
      const days = Math.max(1, parseInt(suspendDays) || 7);
      const until = new Date(Date.now() + days * 86400000).toISOString();
      const { error } = await supabase
        .from("profile_moderation")
        .upsert({ user_id: ownerId, suspended_until: until, suspension_reason: message.trim() || null, suspended_by: userId });
      if (error) { setSubmitting(false); return toast.error("No se pudo suspender"); }
      if (message.trim()) {
        await supabase.rpc("admin_notify_user", { _user_id: ownerId, _message: `[Moderación] Cuenta suspendida ${days} días: ${message.trim()}`, _link: null });
      }
      toast.success(`Cuenta suspendida ${days} días`);
    }

    await supabase.from("reports").update({ status: "resolved", resolved_by: userId }).eq("id", actionReport.id);
    setSubmitting(false);
    setActionReport(null);
    load(); onRefresh();
  };

  return (
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="bg-surface-2">
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="reviewing">En revisión</TabsTrigger>
          <TabsTrigger value="resolved">Resueltos</TabsTrigger>
          <TabsTrigger value="dismissed">Descartados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : reports.length === 0 ? (
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
                    <Badge variant="outline" className="border-border">{STATUS_LABELS[r.status]}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <p className="font-display font-semibold">{r.reason}</p>
                  {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
                  <p className="text-xs text-muted-foreground mt-2 font-mono">ID: {r.target_id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {r.status === "pending" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "reviewing")}>
                      <Eye className="h-4 w-4 mr-1" /> Revisar
                    </Button>
                  )}
                  {r.target_type !== "channel" && (
                    <Button size="sm" variant="destructive" onClick={() => openAction(r, "delete")}>
                      <MessageSquareWarning className="h-4 w-4 mr-1" /> Eliminar y avisar
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => openAction(r, "suspend")}>
                    <Ban className="h-4 w-4 mr-1" /> Suspender autor
                  </Button>
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

      <Dialog open={!!actionReport} onOpenChange={(o) => !o && setActionReport(null)}>
        <DialogContent className="bg-popover border-border">
          <DialogHeader>
            <DialogTitle>
              {actionMode === "delete" ? "Eliminar contenido y notificar" : "Suspender cuenta del autor"}
            </DialogTitle>
            <DialogDescription>
              {actionMode === "delete"
                ? "Se eliminará el contenido reportado y se enviará un mensaje al autor explicando el motivo."
                : "La cuenta entrará en modo solo lectura durante el período indicado."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {actionMode === "suspend" && (
              <div>
                <Label className="mb-2 block">Duración</Label>
                <Select value={suspendDays} onValueChange={setSuspendDays}>
                  <SelectTrigger className="bg-surface-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 día</SelectItem>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="14">14 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="modmsg" className="mb-2 block">Mensaje al autor</Label>
              <Textarea
                id="modmsg"
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                className="bg-surface-1 min-h-24"
                placeholder="Explica el motivo..."
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/500</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionReport(null)}>Cancelar</Button>
            <Button onClick={runAction} disabled={submitting} variant={actionMode === "delete" ? "destructive" : "default"}>
              {submitting ? "Aplicando..." : actionMode === "delete" ? "Eliminar y avisar" : "Suspender"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const UsersTab = ({ currentUserId }: { currentUserId: string | undefined }) => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url, created_at, is_channel")
      .order("created_at", { ascending: false })
      .limit(50);
    if (search.trim()) q = q.or(`display_name.ilike.%${search}%,username.ilike.%${search}%`);
    const { data: profiles } = await q;
    const ids = (profiles ?? []).map((p) => p.id);
    const [{ data: roles }, { data: mods }] = await Promise.all([
      ids.length ? supabase.from("user_roles").select("user_id, role").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
      ids.length ? supabase.from("profile_moderation").select("user_id, suspended_until").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
    ]);
    const rolesByUser = (roles ?? []).reduce<Record<string, ("admin" | "moderator" | "user")[]>>((acc, r: any) => {
      (acc[r.user_id] ||= []).push(r.role);
      return acc;
    }, {});
    const susByUser = (mods ?? []).reduce<Record<string, string | null>>((acc, m: any) => {
      acc[m.user_id] = m.suspended_until;
      return acc;
    }, {});
    setUsers((profiles ?? []).map((p: any) => ({
      ...p,
      suspended_until: susByUser[p.id] ?? null,
      roles: rolesByUser[p.id] ?? ["user"],
    })) as UserRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleRole = async (userId: string, role: "admin" | "moderator", has: boolean) => {
    if (userId === currentUserId && role === "admin" && has) {
      return toast.error("No puedes quitarte tu propio rol de admin");
    }
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error("No se pudo quitar el rol");
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error("No se pudo asignar el rol");
    }
    toast.success("Rol actualizado");
    load();
  };

  const suspend = async (userId: string, days: number) => {
    const until = new Date(Date.now() + days * 86400000).toISOString();
    const reason = prompt(`Motivo de la suspensión (${days} días):`) || null;
    const { error } = await supabase
      .from("profile_moderation")
      .upsert({ user_id: userId, suspended_until: until, suspension_reason: reason, suspended_by: currentUserId });
    if (error) return toast.error("No se pudo suspender");
    toast.success(`Cuenta suspendida ${days} días (solo lectura)`);
    load();
  };

  const unsuspend = async (userId: string) => {
    const { error } = await supabase
      .from("profile_moderation")
      .upsert({ user_id: userId, suspended_until: null, suspension_reason: null, suspended_by: null });
    if (error) return toast.error("No se pudo levantar");
    toast.success("Suspensión retirada");
    load();
  };

  const deleteAccount = async (userId: string) => {
    if (userId === currentUserId) return toast.error("No puedes borrarte a ti mismo");
    if (!confirm("¿Borrar permanentemente esta cuenta?")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) return toast.error("No se pudo borrar");
    toast.success("Cuenta eliminada");
    load();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre..." className="pl-10 bg-surface-1" />
      </form>
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => {
            const name = u.display_name || u.username || "Sin nombre";
            const initials = name.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();
            const isAdmin = u.roles.includes("admin");
            const isMod = u.roles.includes("moderator");
            return (
              <Card key={u.id} className="glass-card p-4 flex items-center gap-3 flex-wrap">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-surface-2 text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-[160px]">
                  <p className="font-display font-semibold">{name}</p>
                  <p className="text-xs text-muted-foreground">@{u.username} · {u.is_channel ? "Canal" : "Usuario"}</p>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {isAdmin && <Badge>admin</Badge>}
                  {isMod && <Badge variant="outline">mod</Badge>}
                  {u.suspended_until && new Date(u.suspended_until) > new Date() && (
                    <Badge variant="destructive">suspendido</Badge>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant={isMod ? "outline" : "secondary"} onClick={() => toggleRole(u.id, "moderator", isMod)}>
                    {isMod ? "Quitar mod" : "Hacer mod"}
                  </Button>
                  <Button size="sm" variant={isAdmin ? "outline" : "default"} onClick={() => toggleRole(u.id, "admin", isAdmin)}>
                    {isAdmin ? "Quitar admin" : "Hacer admin"}
                  </Button>
                  {u.suspended_until && new Date(u.suspended_until) > new Date() ? (
                    <Button size="sm" variant="outline" onClick={() => unsuspend(u.id)}>Reactivar</Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => suspend(u.id, 1)}>Susp. 1d</Button>
                      <Button size="sm" variant="outline" onClick={() => suspend(u.id, 7)}>7d</Button>
                      <Button size="sm" variant="outline" onClick={() => suspend(u.id, 30)}>30d</Button>
                    </>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteAccount(u.id)}>
                    Borrar cuenta
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const ContentTab = ({ onRefresh }: { onRefresh: () => void }) => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("videos")
      .select("id, title, views, created_at, channel_id, channel:profiles!videos_channel_id_fkey(display_name, username)")
      .order("created_at", { ascending: false })
      .limit(50);
    setVideos(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este vídeo? Esta acción es permanente.")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
    if (error) return toast.error("No se pudo eliminar");
    toast.success("Vídeo eliminado");
    load(); onRefresh();
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Cargando...</div>;
  return (
    <div className="space-y-2">
      {videos.map((v) => (
        <Card key={v.id} className="glass-card p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="font-display font-semibold truncate">{v.title}</p>
            <p className="text-xs text-muted-foreground">
              {v.channel?.display_name || v.channel?.username} · {v.views} vistas · {formatDistanceToNow(new Date(v.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
          <Button size="sm" variant="outline" asChild><a href={`/watch/${v.id}`} target="_blank" rel="noopener noreferrer"><Eye className="h-4 w-4" /></a></Button>
          <Button size="sm" variant="destructive" onClick={() => remove(v.id)}><Trash2 className="h-4 w-4" /></Button>
        </Card>
      ))}
    </div>
  );
};

const AdminGuard = () => {
  const { isModerator, loading } = useIsAdmin();
  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
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
