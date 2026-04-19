import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export const NotificationsBell = () => {
  const { items, unread, markRead, markAllRead, remove } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-9 w-9 rounded-full hover:bg-surface-2 flex items-center justify-center transition" aria-label="Notificaciones">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] bg-popover border-border p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h3 className="font-display font-semibold">Notificaciones</h3>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllRead} className="h-7 gap-1 text-xs">
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todo
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-[400px]">
          {items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              No tienes notificaciones
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className={`group flex gap-2 p-3 hover:bg-surface-1 transition ${!n.read ? "bg-surface-1/50" : ""}`}>
                  {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    {n.link ? (
                      <Link to={n.link} onClick={() => markRead(n.id)} className="block">
                        <p className="text-sm leading-snug">{n.message}</p>
                      </Link>
                    ) : (
                      <p className="text-sm leading-snug">{n.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="text-muted-foreground hover:text-foreground" aria-label="Marcar leída">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={() => remove(n.id)} className="text-muted-foreground hover:text-foreground" aria-label="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
