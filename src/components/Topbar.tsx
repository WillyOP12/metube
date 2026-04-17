import { Search, LogIn, LogOut, User as UserIcon } from "lucide-react";
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
import { useState } from "react";

export const Topbar = () => {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/explore?q=${encodeURIComponent(q.trim())}`);
  };

  const initials = (profile?.display_name || profile?.username || "?")
    .split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <header className="h-16 sticky top-0 z-40 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
      <SidebarTrigger className="text-foreground" />

      <form onSubmit={onSearch} className="flex-1 max-w-xl mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar vídeos, canales, posts..."
          className="pl-10 h-10 bg-surface-1 border-border focus-visible:ring-1 focus-visible:ring-ring"
        />
      </form>

      <div className="flex items-center gap-2">
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
            <DropdownMenuContent align="end" className="w-56 bg-popover border-border">
              <DropdownMenuLabel>
                <div className="font-medium truncate">{profile?.display_name ?? "Tu cuenta"}</div>
                <div className="text-xs text-muted-foreground truncate">@{profile?.username}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/profile"><UserIcon className="mr-2 h-4 w-4" />Mi perfil</Link></DropdownMenuItem>
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
