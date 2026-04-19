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
  ShieldAlert, Search,
} from "lucide-react";
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

const ReportsTab = ({ userId, onRefresh }: { userId: string | undefined; onRefresh: () => void }) => {
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
    const { error } = await supabase.from("reports").update({ status, resolved_by: userId }).eq("id", id);
    if (error) toast.error("Error actualizando");
    else { toast.success("Reporte actualizado"); load(); onRefresh(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("reports").delete().eq("id", id);
    if (error) toast.error("Error eliminando");
    else { toast.success("Reporte eliminado"); load(); onRefresh(); }
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
    const { data: roles } = ids.length
      ? await supabase.from("user_roles").select("user_id, role").in("user_id", ids)
      : { data: [] };
    const rolesByUser = (roles ?? []).reduce<Record<string, ("admin" | "moderator" | "user")[]>>((acc, r: any) => {
      (acc[r.user_id] ||= []).push(r.role);
      return acc;
    }, {});
    setUsers((profiles ?? []).map((p) => ({ ...p, roles: rolesByUser[p.id] ?? ["user"] })) as UserRow[]);
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
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant={isMod ? "outline" : "secondary"} onClick={() => toggleRole(u.id, "moderator", isMod)}>
                    {isMod ? "Quitar mod" : "Hacer mod"}
                  </Button>
                  <Button size="sm" variant={isAdmin ? "outline" : "default"} onClick={() => toggleRole(u.id, "admin", isAdmin)}>
                    {isAdmin ? "Quitar admin" : "Hacer admin"}
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
