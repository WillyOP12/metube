import { Home, Compass, Film, ListVideo, Users, Flag, User as UserIcon, Settings, Upload } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "./Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useIsAdmin";

const mainNav = [
  { title: "Inicio", url: "/", icon: Home },
  { title: "Explorar", url: "/explore", icon: Compass },
  { title: "Shorts", url: "/shorts", icon: Film },
  { title: "Listas", url: "/playlists", icon: ListVideo },
  { title: "Suscripciones", url: "/subscriptions", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isModerator } = useIsAdmin();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const linkClass = (path: string) =>
    `flex items-center gap-3 w-full rounded-lg px-3 py-2 transition-colors ${
      isActive(path)
        ? "bg-sidebar-accent text-sidebar-accent-foreground"
        : "hover:bg-sidebar-accent/60 text-sidebar-foreground"
    }`;

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border">
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <Logo collapsed={collapsed} />
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Navegar</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className={linkClass(item.url)}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Tú</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/profile" className={linkClass("/profile")}>
                      <UserIcon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="font-medium">Mi perfil</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {profile?.is_channel && (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/upload" className={linkClass("/upload")}>
                        <Upload className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="font-medium">Subir vídeo</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={linkClass("/settings")}>
                      <Settings className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="font-medium">Ajustes</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {isModerator && (
          <SidebarGroup>
            <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>Moderación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin" className={linkClass("/admin")}>
                      <Flag className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="font-medium">Reportes</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
