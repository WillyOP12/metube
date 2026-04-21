import { Search, LogIn, LogOut, User as UserIcon, Settings as SettingsIcon, UserPlus, Check, X, Tv } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAccounts } from "@/hooks/useAccounts";
import { useState } from "react";
import { NotificationsBell } from "./NotificationsBell";
import { toast } from "sonner";

export const Topbar = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { accounts, switchTo, remove } = useAccounts();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const initials = (profile?.display_name || profile?.username || "?")
    .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const initialsOf = (n?: string | null) => (n || "?").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  const handleSwitch = async (acc: typeof accounts[number]) => {
    if (acc.user_id === user?.id) return;
    try {
      await switchTo(acc);
      toast.success(`Cambiado a ${acc.display_name || acc.username || acc.email}`);
    } catch {
      toast.error("Sesión caducada, vuelve a iniciar sesión");
      navigate("/auth");
    }
  };

  return (
    <header className="h-16 sticky top-0 z-40 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
      <SidebarTrigger className="text-foreground" />

      <form onSubmit={onSearch} className="flex-1 max-w-xl mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar vídeos, canales, listas..."
          className="pl-10 h-10 bg-surface-1 border-border focus-visible:ring-1 focus-visible:ring-ring"
        />
      </form>

      <div className="flex items-center gap-2">
        {user && <NotificationsBell />}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring transition">
                <Avatar className="h-9 w-9 border border-border">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-surface-2 text-foreground text-xs font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-popover border-border">
              <DropdownMenuLabel>
                <div className="font-medium truncate">{profile?.display_name ?? "Tu cuenta"}</div>
                <div className="text-xs text-muted-foreground truncate">@{profile?.username}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to={`/c/${user.id}`}><Tv className="mr-2 h-4 w-4" />Ir a mi canal</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Mi perfil</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/settings"><SettingsIcon className="mr-2 h-4 w-4" />Ajustes</Link></DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pt-2">Cuentas</DropdownMenuLabel>
              {accounts.map((acc) => {
                const active = acc.user_id === user.id;
                const label = acc.display_name || acc.username || acc.email;
                return (
                  <div key={acc.user_id} className="flex items-center gap-1 pr-1">
                    <DropdownMenuItem
                      onClick={() => handleSwitch(acc)}
                      className="flex-1 gap-2 cursor-pointer"
                    >
                      <Avatar className="h-6 w-6 border border-border">
                        <AvatarImage src={acc.avatar_url ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-surface-2">{initialsOf(label)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{label}</div>
                        <div className="text-[10px] text-muted-foreground truncate">{acc.email}</div>
                      </div>
                      {active && <Check className="h-3.5 w-3.5 text-foreground" />}
                    </DropdownMenuItem>
                    {!active && (
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(acc.user_id); }}
                        className="h-6 w-6 rounded hover:bg-surface-2 flex items-center justify-center text-muted-foreground hover:text-foreground"
                        aria-label="Quitar cuenta"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              <DropdownMenuItem asChild>
                <Link to="/auth?add=1"><UserPlus className="mr-2 h-4 w-4" />Añadir otra cuenta</Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild size="sm" variant="default" className="gap-2">
            <Link to="/auth"><LogIn className="h-4 w-4" />Entrar</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
